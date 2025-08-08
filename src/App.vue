<template>
  <div id="app">
    <div class="container">
      <h1>Azure Pipeline Batch Deployer</h1>

      <!-- Configuration Section -->
      <div v-if="!isConfigured" class="config-section">
        <h2>Azure DevOps Configuration</h2>
        <div class="form-group">
          <label>Organization:</label>
          <div class="input-with-edit">
            <input
              v-model="config.organization"
              type="text"
              placeholder="your-organization"
              :disabled="!editMode.organization && config.organization"
              :class="{
                'disabled-input': !editMode.organization && config.organization,
              }"
            />
            <button
              v-if="config.organization && !editMode.organization"
              @click="toggleEditMode('organization')"
              class="edit-btn"
              title="Edit"
            >
              ✏️
            </button>
            <button
              v-if="editMode.organization"
              @click="toggleEditMode('organization')"
              class="save-edit-btn"
              title="Save"
            >
              ✓
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>Project:</label>
          <div class="input-with-edit">
            <input
              v-model="config.project"
              type="text"
              placeholder="your-project"
              :disabled="!editMode.project && config.project"
              :class="{ 'disabled-input': !editMode.project && config.project }"
            />
            <button
              v-if="config.project && !editMode.project"
              @click="toggleEditMode('project')"
              class="edit-btn"
              title="Edit"
            >
              ✏️
            </button>
            <button
              v-if="editMode.project"
              @click="toggleEditMode('project')"
              class="save-edit-btn"
              title="Save"
            >
              ✓
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>Personal Access Token:</label>
          <div class="input-with-edit">
            <input
              v-model="config.pat"
              type="password"
              placeholder="your-pat-token"
              :disabled="!editMode.pat && config.pat"
              :class="{ 'disabled-input': !editMode.pat && config.pat }"
            />
            <button
              v-if="config.pat && !editMode.pat"
              @click="toggleEditMode('pat')"
              class="edit-btn"
              title="Edit"
            >
              ✏️
            </button>
            <button
              v-if="editMode.pat"
              @click="toggleEditMode('pat')"
              class="save-edit-btn"
              title="Save"
            >
              ✓
            </button>
          </div>
        </div>
        <div class="button-group">
          <button
            @click="testConnection"
            class="btn btn-secondary"
            :disabled="!canTest || isTestingConnection"
          >
            {{ isTestingConnection ? "Testing..." : "Test Connection" }}
          </button>
          <button
            @click="saveConfig"
            class="btn btn-primary"
            :disabled="!connectionTested || !connectionSuccessful"
          >
            Connect
          </button>
        </div>
        <div
          v-if="testMessage"
          :class="['message', connectionSuccessful ? 'success' : 'error']"
        >
          <span v-if="connectionSuccessful">✅</span>
          <span v-else>❌</span>
          {{ testMessage }}
        </div>
      </div>

      <!-- Pipeline Management Section -->
      <div v-else class="pipeline-section">
        <div class="header">
          <h2>Pipeline Deployments</h2>
          <button @click="resetConfig" class="btn btn-secondary">
            Change Config
          </button>
        </div>

        <!-- Add Pipeline Form -->
        <div class="add-pipeline">
          <h3>Add Pipelines for Deployment</h3>
          <div class="input-row">
            <div class="pipeline-dropdown-container">
              <input
                v-model="pipelineSearch"
                type="text"
                placeholder="Search and select pipeline..."
                @focus="showPipelineDropdown = true"
                @input="filterPipelines"
                @keydown.down="navigateDropdown(1)"
                @keydown.up="navigateDropdown(-1)"
                @keydown.enter="selectHighlightedPipeline"
                @keydown.escape="showPipelineDropdown = false"
                class="pipeline-search-input"
              />
              <div
                v-if="showPipelineDropdown && filteredPipelines.length > 0"
                class="pipeline-dropdown"
              >
                <div
                  v-for="(pipeline, index) in filteredPipelines"
                  :key="pipeline.id"
                  @click="selectPipeline(pipeline)"
                  :class="[
                    'pipeline-option',
                    { highlighted: highlightedIndex === index },
                  ]"
                  @mouseenter="highlightedIndex = index"
                >
                  <span class="pipeline-name">{{ pipeline.name }}</span>
                  <span v-if="pipeline.folder" class="pipeline-folder">{{
                    pipeline.folder
                  }}</span>
                </div>
              </div>
              <div
                v-if="
                  showPipelineDropdown &&
                  filteredPipelines.length === 0 &&
                  pipelineSearch
                "
                class="pipeline-dropdown"
              >
                <div class="no-results">No pipelines found</div>
              </div>
            </div>
            <div class="build-input-container">
              <input
                v-model="newPipeline.buildId"
                type="text"
                placeholder="Build ID (5+ digits)"
                @keyup.enter="addPipeline"
                @input="debouncedValidateBuild"
                @blur="validateBuild"
                :class="{ 'error-input': buildValidationError }"
              />
              <span v-if="checkingBuild" class="build-status checking"
                >Checking...</span
              >
              <span
                v-if="buildValidated && !buildValidationError"
                class="build-status valid"
                >✓ Ready</span
              >
            </div>
            <select
              v-model="newPipeline.targetStage"
              @change="validateBuild"
              class="stage-select"
            >
              <option value="Deploy Dev">Deploy Dev</option>
              <option value="Deploy QA">Deploy QA</option>
              <option value="Deploy Prod">Deploy Prod</option>
            </select>
            <button
              @click="addPipeline"
              class="btn btn-add"
              :disabled="
                !newPipeline.pipelineId ||
                !newPipeline.buildId ||
                checkingBuild ||
                !!buildValidationError
              "
            >
              Add
            </button>
          </div>
          <div v-if="loadingPipelines" class="loading-message">
            Loading pipelines...
          </div>
          <div v-if="buildValidationError" class="validation-error">
            ⚠️ {{ buildValidationError }}
          </div>
        </div>

        <!-- Batch Import -->
        <div class="batch-import">
          <div
            class="collapsible-header"
            @click="showBatchImport = !showBatchImport"
          >
            <h3>
              <span class="collapse-icon">{{
                showBatchImport ? "▼" : "▶"
              }}</span>
              OR Batch Import (comma-separated)
            </h3>
          </div>
          <div v-show="showBatchImport" class="collapsible-content">
            <textarea
              v-model="batchInput"
              placeholder="Format: pipelineId:buildId:stage, pipelineId:buildId:stage, ...&#10;Example: 123:456:Deploy Prod, 789:012:Deploy QA&#10;Stage is optional (defaults to Deploy Prod)"
              rows="3"
            ></textarea>
            <select v-model="defaultStage" class="stage-select">
              <option value="Deploy Dev">Default: Deploy Dev</option>
              <option value="Deploy QA">Default: Deploy QA</option>
              <option value="Deploy Prod">Default: Deploy Prod</option>
            </select>
            <button @click="importBatch" class="btn btn-secondary">
              Import Batch
            </button>
          </div>
        </div>

        <!-- Pipeline List -->
        <div class="pipeline-list" v-if="pipelines.length > 0">
          <h3>Pipelines to Deploy ({{ pipelines.length }})</h3>
          <table>
            <thead>
              <tr>
                <th>Pipeline</th>
                <th>Build ID</th>
                <th>Target Stage</th>
                <th>Status</th>
                <th>Stages Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(pipeline, index) in pipelines" :key="index">
                <td>
                  <div class="pipeline-info">
                    <span class="pipeline-name">{{
                      pipeline.pipelineName || `Pipeline ${pipeline.pipelineId}`
                    }}</span>
                    <span class="pipeline-id"
                      >ID: {{ pipeline.pipelineId }}</span
                    >
                  </div>
                </td>
                <td>{{ pipeline.buildId }}</td>
                <td>
                  <span class="target-stage">{{
                    pipeline.targetStage || "Deploy Dev"
                  }}</span>
                </td>
                <td>
                  <div class="status-cell">
                    <span :class="'status ' + getStatusClass(pipeline.status)">
                      {{ pipeline.status || "Ready" }}
                    </span>
                    <div v-if="pipeline.approvalStatus" class="approval-info">
                      <span class="approval-badge">✅ {{ pipeline.approvalStatus }}</span>
                    </div>
                    <div
                      v-if="pipeline.errorMessage || pipeline.errorDetails"
                      class="error-info"
                    >
                      <button
                        @click="toggleError(pipeline)"
                        class="error-toggle"
                      >
                        ⚠️ Details
                      </button>
                      <div v-if="pipeline.showError" class="error-details">
                        {{ pipeline.errorMessage || pipeline.errorDetails }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div
                    v-if="pipeline.stages && pipeline.stages.length > 0"
                    class="stages-container"
                  >
                    <div
                      v-for="stage in pipeline.stages"
                      :key="stage.name"
                      class="stage-badge"
                    >
                      <span
                        :class="'stage-status ' + getStageStatusClass(stage)"
                      >
                        {{ getStageShortName(stage.name) }}
                      </span>
                    </div>
                  </div>
                  <span v-else class="no-stages">-</span>
                </td>
                <td>
                  <button
                    @click="editPipeline(index)"
                    class="btn btn-small btn-primary"
                    :disabled="pipeline.status !== 'Ready'"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    @click="removePipeline(index)"
                    class="btn btn-small btn-danger"
                    title="Remove"
                  >
                    Remove
                  </button>
                  <a
                    v-if="pipeline.url"
                    :href="pipeline.url"
                    target="_blank"
                    class="btn btn-small btn-link"
                    title="View in Azure DevOps"
                    >View</a
                  >
                </td>
              </tr>
            </tbody>
          </table>

          <div class="actions">
            <button
              @click="deployAll"
              class="btn btn-success btn-large"
              :disabled="isDeploying"
            >
              {{
                isDeploying
                  ? "Deploying..."
                  : `Deploy All (${pipelines.length} Pipelines)`
              }}
            </button>
            <button @click="clearAll" class="btn btn-danger">Clear All</button>
          </div>
        </div>

        <!-- Deployment History -->
        <div class="deployment-history" v-if="deploymentHistory.length > 0">
          <h3>Deployment History</h3>
          <div
            v-for="batch in deploymentHistory"
            :key="batch.batchId"
            class="batch-card"
          >
            <div class="batch-header">
              <span class="batch-id">Batch: {{ batch.batchId }}</span>
              <span class="batch-time">{{ formatTime(batch.startTime) }}</span>
              <button @click="refreshBatchStatus(batch)" class="btn btn-small">
                Refresh Status
              </button>
            </div>
            <div class="batch-summary">
              <span class="summary-item success"
                >Succeeded: {{ batch.summary.succeeded }}</span
              >
              <span class="summary-item failed"
                >Failed: {{ batch.summary.failed }}</span
              >
              <span class="summary-item pending"
                >In Progress: {{ batch.summary.inProgress }}</span
              >
              <span class="summary-item total"
                >Total: {{ batch.summary.total }}</span
              >
            </div>
            <div class="batch-progress">
              <div
                class="progress-bar"
                :style="{ width: getProgressWidth(batch) + '%' }"
                :class="getProgressClass(batch)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Production Deployment Confirmation Modal -->
    <div
      v-if="showProdConfirmModal"
      class="modal-overlay"
      @click.self="cancelProdDeployment"
    >
      <div class="modal">
        <div class="modal-header">
          <h2>⚠️ Production Deployment Confirmation</h2>
        </div>
        <div class="modal-body">
          <p class="warning-text">
            You are about to deploy to <strong>PRODUCTION</strong>. Please
            review the following deployments:
          </p>

          <div class="deployment-list">
            <div
              v-for="(pipeline, index) in prodPipelines"
              :key="index"
              class="deployment-item"
            >
              <div class="deployment-info">
                <span class="label">Pipeline:</span>
                <span class="value">{{
                  pipeline.pipelineName || `Pipeline ${pipeline.pipelineId}`
                }}</span>
              </div>
              <div class="deployment-info">
                <span class="label">Build ID:</span>
                <span class="value">{{ pipeline.buildId }}</span>
              </div>
              <div class="deployment-info">
                <span class="label">Target:</span>
                <span class="value prod">{{ pipeline.targetStage }}</span>
              </div>
            </div>
          </div>

          <div class="confirmation-section">
            <p class="confirm-instruction">
              Hold the button below for 3 seconds to confirm deployment to
              production:
            </p>

            <button
              @mousedown="startProdConfirm"
              @mouseup="stopProdConfirm"
              @mouseleave="stopProdConfirm"
              @touchstart="startProdConfirm"
              @touchend="stopProdConfirm"
              @touchcancel="stopProdConfirm"
              :class="['confirm-button', { confirming: isConfirming }]"
              :style="{ '--progress': confirmProgress + '%' }"
            >
              <span v-if="!isConfirming">Hold to Deploy to Production</span>
              <span v-else>{{ confirmText }}</span>
            </button>

            <button @click="cancelProdDeployment" class="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from "vue";
import azureDevOps from "./services/azureDevOps";
import cryptoService from "./services/crypto";

export default {
  name: "App",
  setup() {
    const isConfigured = ref(false);
    const config = ref({
      organization: "",
      project: "",
      pat: "",
    });
    const connectionError = ref("");
    const connectionTested = ref(false);
    const connectionSuccessful = ref(false);
    const isTestingConnection = ref(false);
    const testMessage = ref("");
    const pipelines = ref([]);
    const newPipeline = ref({
      pipelineId: "",
      buildId: "",
      targetStage: "Deploy Dev",
    });
    const batchInput = ref("");
    const defaultStage = ref("Deploy Dev");
    const isDeploying = ref(false);
    const showBatchImport = ref(false);
    const deploymentHistory = ref([]);
    let refreshInterval = null;

    // Pipeline dropdown state
    const availablePipelines = ref([]);
    const filteredPipelines = ref([]);
    const pipelineSearch = ref("");
    const showPipelineDropdown = ref(false);
    const highlightedIndex = ref(0);
    const loadingPipelines = ref(false);

    // Build validation state
    const checkingBuild = ref(false);
    const buildValidated = ref(false);
    const buildValidationError = ref("");
    let validateBuildTimeout = null;

    // Production confirmation modal state
    const showProdConfirmModal = ref(false);
    const prodPipelines = ref([]);
    const isConfirming = ref(false);
    const confirmProgress = ref(0);
    const confirmText = ref("Hold for 3 seconds");
    let confirmTimer = null;
    let confirmInterval = null;

    // Edit mode for configuration fields
    const editMode = ref({
      organization: true,
      project: true,
      pat: true,
    });

    const canTest = ref(true);

    const testConnection = async () => {
      if (
        !config.value.organization ||
        !config.value.project ||
        !config.value.pat
      ) {
        testMessage.value = "Please fill in all fields";
        connectionSuccessful.value = false;
        return;
      }

      isTestingConnection.value = true;
      testMessage.value = "";
      connectionTested.value = false;
      connectionSuccessful.value = false;

      azureDevOps.initialize(config.value);

      const result = await azureDevOps.testConnection();

      isTestingConnection.value = false;
      connectionTested.value = true;

      if (result.success) {
        connectionSuccessful.value = true;
        testMessage.value = `Connection successful! Found ${
          result.data?.value?.length || 0
        } pipelines in project.`;
      } else {
        connectionSuccessful.value = false;
        if (result.error.includes("401")) {
          testMessage.value =
            "Authentication failed. Please check your Personal Access Token.";
        } else if (result.error.includes("404")) {
          testMessage.value =
            "Organization or Project not found. Please check your settings.";
        } else if (result.error.includes("403")) {
          testMessage.value =
            "Access denied. Ensure your PAT has the required permissions.";
        } else {
          testMessage.value = `Connection failed: ${result.error}`;
        }
      }
    };

    const saveConfig = async () => {
      if (connectionSuccessful.value) {
        isConfigured.value = true;
        cryptoService.saveConfig(config.value);
        testMessage.value = "";
        // Load pipelines after successful connection
        loadPipelines();
      }
    };

    const resetConfig = () => {
      isConfigured.value = false;
      // Don't clear config, just reload it from storage
      const savedConfig = cryptoService.loadConfig();
      if (savedConfig) {
        config.value = savedConfig;
        // Start with fields disabled (not in edit mode)
        editMode.value = {
          organization: false,
          project: false,
          pat: false,
        };
      } else {
        config.value = { organization: "", project: "", pat: "" };
      }
      connectionTested.value = false;
      connectionSuccessful.value = false;
      testMessage.value = "";
    };

    const toggleEditMode = (field) => {
      editMode.value[field] = !editMode.value[field];
      // Reset connection test when editing
      if (editMode.value[field]) {
        connectionTested.value = false;
        connectionSuccessful.value = false;
        testMessage.value = "";
      }
    };

    const validateBuild = async () => {
      const buildId = newPipeline.value.buildId;

      // Don't validate if build ID is empty or too short (less than 5 digits typical)
      if (!buildId || buildId.length < 5) {
        buildValidated.value = false;
        buildValidationError.value = "";
        return;
      }

      checkingBuild.value = true;
      buildValidationError.value = "";
      buildValidated.value = false;

      try {
        // First check if the build exists
        const buildCheck = await azureDevOps.checkBuildStageStatus(
          buildId,
          "Build"
        );

        // If we get an error response indicating build not found
        if (buildCheck.error) {
          buildValidationError.value =
            "Invalid Build ID. Please check and try again.";
          checkingBuild.value = false;
          return;
        }

        // Then check prerequisites if a target stage is selected
        if (newPipeline.value.targetStage) {
          const result = await azureDevOps.checkBuildPrerequisites(
            buildId,
            newPipeline.value.targetStage
          );

          if (!result.valid) {
            buildValidationError.value = result.message;
          } else {
            buildValidated.value = true;
            buildValidationError.value = ""; // Clear any previous error
          }
        } else {
          // Build is valid even without stage check
          buildValidated.value = true;
          buildValidationError.value = ""; // Clear any previous error
        }
      } catch (error) {
        if (error.message.includes("Build not found")) {
          buildValidationError.value =
            "Build not found. Please check the Build ID.";
        } else {
          buildValidationError.value = error.message;
        }
      }

      checkingBuild.value = false;
    };

    const debouncedValidateBuild = () => {
      // Clear any existing timeout
      if (validateBuildTimeout) {
        clearTimeout(validateBuildTimeout);
      }

      // Only validate if we have at least 5 digits
      if (newPipeline.value.buildId && newPipeline.value.buildId.length >= 5) {
        // Wait 1 second after user stops typing
        validateBuildTimeout = setTimeout(() => {
          validateBuild();
        }, 1000);
      } else {
        // Clear validation state if build ID is too short
        buildValidated.value = false;
        buildValidationError.value = "";
      }
    };

    const addPipeline = async () => {
      if (!newPipeline.value.pipelineId || !newPipeline.value.buildId) {
        return;
      }

      // If validation failed, don't add
      if (buildValidationError.value) {
        return;
      }

      // If not validated yet, validate now
      if (!buildValidated.value) {
        await validateBuild();
        if (buildValidationError.value) {
          return;
        }
      }

      pipelines.value.push({
        pipelineId: newPipeline.value.pipelineId,
        pipelineName: newPipeline.value.pipelineName,
        buildId: newPipeline.value.buildId,
        targetStage: newPipeline.value.targetStage,
        status: "Ready",
      });

      // Reset form
      newPipeline.value = {
        pipelineId: "",
        buildId: "",
        targetStage: "Deploy Dev",
      };
      pipelineSearch.value = "";
      buildValidated.value = false;
      buildValidationError.value = "";
    };

    const importBatch = () => {
      const pairs = batchInput.value.split(",").map((p) => p.trim());
      pairs.forEach((pair) => {
        const parts = pair.split(":").map((v) => v.trim());
        const [pipelineId, buildId, stage] = parts;
        if (pipelineId && buildId) {
          pipelines.value.push({
            pipelineId,
            buildId,
            targetStage: stage || defaultStage.value,
            status: "Ready",
          });
        }
      });
      batchInput.value = "";
    };

    const removePipeline = (index) => {
      pipelines.value.splice(index, 1);
    };

    const editPipeline = (index) => {
      const pipeline = pipelines.value[index];
      
      // Prefill the form with the pipeline's values
      newPipeline.value.pipelineId = pipeline.pipelineId;
      newPipeline.value.pipelineName = pipeline.pipelineName;
      newPipeline.value.buildId = pipeline.buildId;
      newPipeline.value.targetStage = pipeline.targetStage;
      
      // Set the pipeline name in the search field if it exists
      if (pipeline.pipelineName) {
        pipelineSearch.value = pipeline.pipelineName;
      } else {
        pipelineSearch.value = `Pipeline ${pipeline.pipelineId}`;
      }
      
      // Remove the pipeline from the list
      pipelines.value.splice(index, 1);
      
      // Clear validation states since we're editing an existing valid entry
      buildValidated.value = true;
      buildValidationError.value = '';
      
      // Scroll to the top to show the form (optional)
      const addPipelineSection = document.querySelector('.add-pipeline');
      if (addPipelineSection) {
        addPipelineSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const clearAll = () => {
      pipelines.value = [];
    };

    const deployAll = async () => {
      if (pipelines.value.length === 0) return;

      // Check if any pipelines are targeting production
      const prodDeployments = pipelines.value.filter(
        (p) => p.targetStage === "Deploy Prod" || p.targetStage === "Prod"
      );

      if (prodDeployments.length > 0) {
        // Show production confirmation modal
        prodPipelines.value = prodDeployments;
        showProdConfirmModal.value = true;
        return;
      }

      // No production deployments, proceed normally
      await executeDeployment();
    };

    const executeDeployment = async () => {
      isDeploying.value = true;
      const result = await azureDevOps.triggerBatchDeployment(pipelines.value);

      // Update pipeline statuses
      result.results.forEach((res, index) => {
        if (pipelines.value[index]) {
          pipelines.value[index].status = res.status;
          pipelines.value[index].runId = res.runId;
          pipelines.value[index].url = res.url;
          pipelines.value[index].targetStage = res.targetStage;
          pipelines.value[index].pipelineName = res.pipelineName;
          pipelines.value[index].errorMessage = res.errorMessage;
          pipelines.value[index].showError = false;
        }
      });

      // Add to history
      const historyEntry = {
        batchId: result.batchId,
        startTime: result.startTime,
        pipelines: result.results.filter((r) => r.runId).map((r) => r.runId),
        summary: {
          total: result.results.length,
          succeeded: 0,
          failed: result.results.filter((r) => !r.success).length,
          inProgress: result.results.filter((r) => r.success).length,
        },
      };

      deploymentHistory.value.unshift(historyEntry);
      isDeploying.value = false;

      // Start monitoring
      startStatusMonitoring();
    };

    // Production confirmation handlers
    const startProdConfirm = () => {
      isConfirming.value = true;
      confirmProgress.value = 0;
      confirmText.value = "Hold for 3 seconds...";

      const startTime = Date.now();
      const duration = 3000; // 3 seconds

      confirmInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        confirmProgress.value = progress;

        const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
        if (remaining > 0) {
          confirmText.value = `Hold for ${remaining} second${
            remaining !== 1 ? "s" : ""
          }...`;
        } else {
          confirmText.value = "Deploying...";
        }

        if (progress >= 100) {
          clearInterval(confirmInterval);
          confirmProdDeployment();
        }
      }, 50);
    };

    const stopProdConfirm = () => {
      if (confirmInterval) {
        clearInterval(confirmInterval);
        confirmInterval = null;
      }
      isConfirming.value = false;
      confirmProgress.value = 0;
      confirmText.value = "Hold for 3 seconds";
    };

    const confirmProdDeployment = async () => {
      showProdConfirmModal.value = false;
      stopProdConfirm();
      await executeDeployment();
    };

    const cancelProdDeployment = () => {
      showProdConfirmModal.value = false;
      stopProdConfirm();
      prodPipelines.value = [];
    };

    const refreshBatchStatus = async (batch) => {
      if (!batch.pipelines || batch.pipelines.length === 0) return;

      const statuses = await azureDevOps.getBatchStatus(batch.pipelines);

      let succeeded = 0;
      let failed = 0;
      let inProgress = 0;

      statuses.forEach((status) => {
        if (status.state === "completed") {
          if (status.result === "succeeded") succeeded++;
          else if (status.result === "failed") failed++;
        } else {
          inProgress++;
        }

        // Update pipeline status in the list
        const pipeline = pipelines.value.find((p) => p.runId === status.runId);
        if (pipeline) {
          pipeline.status =
            status.state === "completed" ? status.result : status.state;
          pipeline.stages = status.stages;
          pipeline.errorDetails = status.errorDetails;
          
          // Show approval status if auto-approved
          if (status.approvalStatus) {
            pipeline.approvalStatus = status.approvalStatus;
          }
        }
      });

      batch.summary.succeeded = succeeded;
      batch.summary.failed = failed;
      batch.summary.inProgress = inProgress;
    };

    const startStatusMonitoring = () => {
      if (refreshInterval) clearInterval(refreshInterval);

      refreshInterval = setInterval(async () => {
        for (const batch of deploymentHistory.value) {
          if (batch.summary.inProgress > 0) {
            await refreshBatchStatus(batch);
          }
        }
      }, 5000); // Refresh every 5 seconds
    };

    const getStatusClass = (status) => {
      if (!status || status === "Ready") return "ready";
      if (status === "Started" || status === "inProgress") return "in-progress";
      if (status === "succeeded") return "success";
      if (status === "failed" || status.includes("Failed")) return "failed";
      return "";
    };

    const getProgressWidth = (batch) => {
      if (batch.summary.total === 0) return 0;
      return (
        ((batch.summary.succeeded + batch.summary.failed) /
          batch.summary.total) *
        100
      );
    };

    const getProgressClass = (batch) => {
      if (batch.summary.failed > 0) return "failed";
      if (batch.summary.inProgress > 0) return "in-progress";
      return "success";
    };

    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString();
    };

    const getStageShortName = (stageName) => {
      if (stageName.includes("Dev")) return "DEV";
      if (stageName.includes("QA")) return "QA";
      if (stageName.includes("Prod")) return "PROD";
      return stageName.substring(0, 4).toUpperCase();
    };

    const getStageStatusClass = (stage) => {
      if (!stage.state || stage.state === "pending") return "pending";
      if (stage.state === "inProgress") return "in-progress";
      if (stage.state === "completed") {
        if (stage.result === "succeeded") return "succeeded";
        if (stage.result === "failed") return "failed";
        if (stage.result === "skipped") return "skipped";
      }
      return "";
    };

    const toggleError = (pipeline) => {
      pipeline.showError = !pipeline.showError;
    };

    // Pipeline dropdown functions
    const loadPipelines = async () => {
      loadingPipelines.value = true;
      try {
        availablePipelines.value = await azureDevOps.getPipelines();
        filteredPipelines.value = availablePipelines.value.slice(0, 20); // Show first 20
      } catch (error) {
        console.error("Failed to load pipelines:", error);
      }
      loadingPipelines.value = false;
    };

    const filterPipelines = () => {
      const search = pipelineSearch.value.toLowerCase();
      if (!search) {
        filteredPipelines.value = availablePipelines.value.slice(0, 20);
      } else {
        filteredPipelines.value = availablePipelines.value
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search) ||
              p.displayName.toLowerCase().includes(search)
          )
          .slice(0, 20); // Limit to 20 results
      }
      highlightedIndex.value = 0;
    };

    const selectPipeline = (pipeline) => {
      newPipeline.value.pipelineId = pipeline.id;
      newPipeline.value.pipelineName = pipeline.name;
      pipelineSearch.value = pipeline.name;
      showPipelineDropdown.value = false;

      // Clear build ID and validation when pipeline changes
      newPipeline.value.buildId = "";
      buildValidated.value = false;
      buildValidationError.value = "";

      // Clear any pending validation timeout
      if (validateBuildTimeout) {
        clearTimeout(validateBuildTimeout);
      }
    };

    const selectHighlightedPipeline = () => {
      if (filteredPipelines.value.length > 0 && highlightedIndex.value >= 0) {
        selectPipeline(filteredPipelines.value[highlightedIndex.value]);
      }
    };

    const navigateDropdown = (direction) => {
      const newIndex = highlightedIndex.value + direction;
      if (newIndex >= 0 && newIndex < filteredPipelines.value.length) {
        highlightedIndex.value = newIndex;
      }
    };

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      const dropdownContainer = document.querySelector(
        ".pipeline-dropdown-container"
      );
      if (dropdownContainer && !dropdownContainer.contains(event.target)) {
        showPipelineDropdown.value = false;
      }
    };

    // Auto-save config values (except when already configured)
    watch([() => config.value.organization, () => config.value.project], () => {
      if (!isConfigured.value) {
        // Save org and project immediately, but not PAT until tested
        const tempConfig = {
          organization: config.value.organization,
          project: config.value.project,
          pat: "",
        };
        localStorage.setItem("tempConfig", JSON.stringify(tempConfig));
      }
    });

    // Reset build validation when target stage changes
    watch(
      () => newPipeline.value.targetStage,
      () => {
        buildValidated.value = false;
        buildValidationError.value = "";
        // Validate if build ID is filled
        if (
          newPipeline.value.buildId &&
          newPipeline.value.buildId.length >= 5
        ) {
          validateBuild();
        }
      }
    );

    onMounted(() => {
      // First try to load saved encrypted config
      const savedConfig = cryptoService.loadConfig();
      if (savedConfig && savedConfig.pat) {
        config.value = savedConfig;
        azureDevOps.initialize(config.value);
        isConfigured.value = true;
        // Load available pipelines
        loadPipelines();
      } else {
        // Load temporary config (org and project only)
        const tempConfig = localStorage.getItem("tempConfig");
        if (tempConfig) {
          const parsed = JSON.parse(tempConfig);
          config.value.organization = parsed.organization || "";
          config.value.project = parsed.project || "";
        }
        // If we have saved values, start with edit mode disabled for those fields
        editMode.value = {
          organization: !config.value.organization,
          project: !config.value.project,
          pat: !config.value.pat,
        };
      }

      // Add click outside listener
      document.addEventListener("click", handleClickOutside);
    });

    onUnmounted(() => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (confirmInterval) clearInterval(confirmInterval);
      document.removeEventListener("click", handleClickOutside);
    });

    return {
      isConfigured,
      config,
      connectionError,
      connectionTested,
      connectionSuccessful,
      isTestingConnection,
      testMessage,
      canTest,
      editMode,
      pipelines,
      newPipeline,
      batchInput,
      defaultStage,
      isDeploying,
      showBatchImport,
      deploymentHistory,
      showProdConfirmModal,
      prodPipelines,
      isConfirming,
      confirmProgress,
      confirmText,
      availablePipelines,
      filteredPipelines,
      pipelineSearch,
      showPipelineDropdown,
      highlightedIndex,
      loadingPipelines,
      checkingBuild,
      buildValidated,
      buildValidationError,
      testConnection,
      saveConfig,
      resetConfig,
      toggleEditMode,
      addPipeline,
      importBatch,
      removePipeline,
      editPipeline,
      clearAll,
      deployAll,
      executeDeployment,
      startProdConfirm,
      stopProdConfirm,
      confirmProdDeployment,
      cancelProdDeployment,
      refreshBatchStatus,
      getStatusClass,
      getProgressWidth,
      getProgressClass,
      formatTime,
      getStageShortName,
      getStageStatusClass,
      toggleError,
      loadPipelines,
      filterPipelines,
      selectPipeline,
      selectHighlightedPipeline,
      navigateDropdown,
      validateBuild,
      debouncedValidateBuild,
    };
  },
};
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 15px;
  overflow: hidden;
}

.container {
  max-width: 1200px;
  height: 94dvh;
  margin: 0 auto;
  background: white;
  border-radius: 10px;
  padding: 20px;
  padding-bottom: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

h1 {
  color: #333;
  text-align: center;
  margin-bottom: 20px;
  font-size: 2em;
}

h2 {
  color: #555;
  margin-bottom: 15px;
  font-size: 1.3em;
}

h3 {
  color: #666;
  margin-bottom: 10px;
  font-size: 1.1em;
}

.config-section,
.pipeline-section {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 14px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.add-pipeline,
.batch-import {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 15px;
}

.batch-import {
  padding: 0;
  overflow: hidden;
}

.collapsible-header {
  padding: 15px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.collapsible-header:hover {
  background-color: #ebebeb;
}

.collapsible-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
}

.collapse-icon {
  margin-right: 8px;
  font-size: 0.8em;
  transition: transform 0.2s;
  display: inline-block;
}

.collapsible-content {
  padding: 0 15px 15px 15px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.batch-import .stage-select {
  margin-bottom: 10px;
  margin-right: 10px;
}

.input-row {
  display: flex;
  gap: 10px;
}

.input-row input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 10px;
  font-family: monospace;
  font-size: 13px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn-success {
  background: #48bb78;
  color: white;
}

.btn-success:hover {
  background: #38a169;
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover {
  background: #e53e3e;
}

.btn-add {
  background: #4299e1;
  color: white;
}

.btn-add:hover {
  background: #3182ce;
}

.btn-large {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
}

.btn-small {
  padding: 5px 10px;
  font-size: 14px;
  margin-right: 5px;
}

.btn-link {
  background: transparent;
  color: #667eea;
  text-decoration: underline;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #e2e8f0;
  color: #a0aec0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

table th,
table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
  font-size: 14px;
}

table th {
  background: #f8f9fa;
  font-weight: bold;
  color: #555;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: bold;
}

.status.ready {
  background: #e2e8f0;
  color: #2d3748;
}

.status.in-progress {
  background: #fed7d7;
  color: #c53030;
}

.status.success {
  background: #c6f6d5;
  color: #22543d;
}

.status.failed {
  background: #feb2b2;
  color: #742a2a;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

.deployment-history {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
}

.batch-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.batch-id {
  font-weight: bold;
  color: #555;
}

.batch-time {
  color: #718096;
  font-size: 14px;
}

.batch-summary {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.summary-item {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
}

.summary-item.success {
  background: #c6f6d5;
  color: #22543d;
}

.summary-item.failed {
  background: #feb2b2;
  color: #742a2a;
}

.summary-item.pending {
  background: #fed7d7;
  color: #c53030;
}

.summary-item.total {
  background: #e2e8f0;
  color: #2d3748;
}

.batch-progress {
  height: 20px;
  background: #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s;
}

.progress-bar.success {
  background: #48bb78;
}

.progress-bar.in-progress {
  background: #ed8936;
}

.progress-bar.failed {
  background: #f56565;
}

.error {
  color: #e53e3e;
  margin-top: 10px;
  padding: 10px;
  background: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 5px;
}

.stage-select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  background: white;
  cursor: pointer;
}

.target-stage {
  font-weight: bold;
  color: #4a5568;
  background: #edf2f7;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.stages-container {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.stage-badge {
  display: inline-block;
}

.stage-status {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stage-status.pending {
  background: #e2e8f0;
  color: #64748b;
}

.stage-status.in-progress {
  background: #fef3c7;
  color: #92400e;
  animation: pulse 1.5s infinite;
}

.stage-status.succeeded {
  background: #d1fae5;
  color: #065f46;
}

.stage-status.failed {
  background: #fee2e2;
  color: #991b1b;
}

.stage-status.skipped {
  background: #f3f4f6;
  color: #9ca3af;
}

.no-stages {
  color: #cbd5e0;
  font-size: 14px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.pipeline-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pipeline-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 14px;
}

.pipeline-id {
  font-size: 11px;
  color: #718096;
}

.status-cell {
  position: relative;
}

.error-info {
  margin-top: 4px;
}

.approval-info {
  margin-top: 4px;
}

.approval-badge {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  display: inline-block;
}

.error-toggle {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.error-toggle:hover {
  background: #fee2e2;
  border-color: #f87171;
}

.error-details {
  margin-top: 8px;
  padding: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 13px;
  color: #991b1b;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 400px;
}

.button-group {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.message {
  margin-top: 15px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.modal-header {
  padding: 20px;
  border-bottom: 2px solid #f0f0f0;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #991b1b;
  font-size: 24px;
}

.modal-body {
  padding: 20px;
}

.warning-text {
  color: #991b1b;
  font-size: 16px;
  margin-bottom: 20px;
  background: #fef2f2;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.warning-text strong {
  color: #dc2626;
  font-weight: bold;
}

.deployment-list {
  background: #f9fafb;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.deployment-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}

.deployment-item:last-child {
  margin-bottom: 0;
}

.deployment-info {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.deployment-info:last-child {
  margin-bottom: 0;
}

.deployment-info .label {
  font-weight: 600;
  color: #4b5563;
  width: 100px;
  font-size: 14px;
}

.deployment-info .value {
  color: #111827;
  font-size: 14px;
  font-family: monospace;
}

.deployment-info .value.prod {
  color: #dc2626;
  font-weight: bold;
}

.confirmation-section {
  padding: 20px;
  background: #fef3c7;
  border-radius: 8px;
  border: 2px solid #fcd34d;
}

.confirm-instruction {
  text-align: center;
  font-size: 14px;
  color: #78350f;
  margin-bottom: 20px;
}

.confirm-button {
  width: 100%;
  padding: 20px;
  font-size: 18px;
  font-weight: bold;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 10px;
}

.confirm-button:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
}

.confirm-button.confirming {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  cursor: grabbing;
}

.confirm-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: var(--progress);
  height: 100%;
  background: rgba(34, 197, 94, 0.3);
  transition: width 0.05s linear;
}

.cancel-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.cancel-button:hover {
  background: #4b5563;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Input with Edit Mode */
.input-with-edit {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-with-edit input {
  flex: 1;
}

.disabled-input {
  background: #f3f4f6;
  color: #4b5563;
  cursor: not-allowed;
}

.edit-btn,
.save-edit-btn {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  min-width: 40px;
}

.edit-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.save-edit-btn {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

.save-edit-btn:hover {
  background: #059669;
  border-color: #059669;
}

/* Pipeline Dropdown Styles */
.pipeline-dropdown-container {
  position: relative;
  flex: 1;
}

.pipeline-search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.pipeline-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 5px 5px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.pipeline-option {
  padding: 10px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.2s;
}

.pipeline-option:hover,
.pipeline-option.highlighted {
  background: #f3f4f6;
}

.pipeline-option .pipeline-name {
  font-weight: 500;
  color: #111827;
}

.pipeline-option .pipeline-folder {
  font-size: 12px;
  color: #6b7280;
  background: #e5e7eb;
  padding: 2px 6px;
  border-radius: 3px;
}

.no-results {
  padding: 15px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

.loading-message {
  margin-top: 10px;
  color: #667eea;
  font-size: 14px;
  font-style: italic;
}

/* Build Validation Styles */
.build-input-container {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
}

.build-input-container input {
  width: 100%;
  padding-right: 60px;
}

.error-input {
  border-color: #ef4444 !important;
  background: #fef2f2 !important;
}

.build-status {
  position: absolute;
  right: 10px;
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
}

.build-status.checking {
  color: #667eea;
  background: #eef2ff;
}

.build-status.valid {
  color: #10b981;
  background: #d1fae5;
}

.validation-error {
  margin-top: 10px;
  padding: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 5px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>
