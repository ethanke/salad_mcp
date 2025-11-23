import axios, { AxiosInstance, AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export interface SaladConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface ContainerGroup {
  name: string;
  display_name?: string;
  container: {
    image: string;
    resources: {
      cpu: number;
      memory: number;
      gpu_classes?: string[];
    };
    command?: string[];
    environment_variables?: Record<string, string>;
    logging?: {
      axiom?: {
        host: string;
        api_token: string;
        dataset: string;
      };
      datadog?: {
        host: string;
        api_key: string;
        tags?: { name: string; value: string }[];
      };
      new_relic?: {
        host: string;
        ingestion_key: string;
      };
      splunk?: {
        host: string;
        token: string;
      };
      tcp?: {
        host: string;
        port: number;
      };
    };
  };
  replicas?: number;
  autostart_policy?: boolean;
  restart_policy?: 'always' | 'on_failure' | 'never';
  country_codes?: string[];
  networking?: {
    protocol: 'http' | 'https';
    port: number;
    auth?: boolean;
  };
  liveness_probe?: {
    http?: {
      path: string;
      port: number;
      scheme?: 'http' | 'https';
      headers?: { name: string; value: string }[];
    };
    tcp?: {
      port: number;
    };
    exec?: {
      command: string[];
    };
    initial_delay_seconds?: number;
    period_seconds?: number;
    timeout_seconds?: number;
    success_threshold?: number;
    failure_threshold?: number;
  };
  readiness_probe?: {
    http?: {
      path: string;
      port: number;
      scheme?: 'http' | 'https';
      headers?: { name: string; value: string }[];
    };
    tcp?: {
      port: number;
    };
    exec?: {
      command: string[];
    };
    initial_delay_seconds?: number;
    period_seconds?: number;
    timeout_seconds?: number;
    success_threshold?: number;
    failure_threshold?: number;
  };
  startup_probe?: {
    http?: {
      path: string;
      port: number;
      scheme?: 'http' | 'https';
      headers?: { name: string; value: string }[];
    };
    tcp?: {
      port: number;
    };
    exec?: {
      command: string[];
    };
    initial_delay_seconds?: number;
    period_seconds?: number;
    timeout_seconds?: number;
    success_threshold?: number;
    failure_threshold?: number;
  };
}

export interface Queue {
  name: string;
  display_name?: string;
  description?: string;
}

export interface InferenceEndpoint {
  id: string;
  name: string;
  display_name?: string;
  metadata?: Record<string, unknown>;
}

export interface Quotas {
  max_created_container_groups?: number;
  max_running_container_groups?: number;
  max_container_group_reallocations_per_minute?: number;
  max_container_group_instances?: number;
}

export interface ContainerGroupInstance {
  id: string;
  machine_id: string;
  state: string;
  version: number;
  ready: boolean;
  started_at?: string;
  container_group_id?: string;
}

export interface QueueJob {
  id: string;
  input: unknown;
  status?: string;
  events?: unknown[];
  create_time?: string;
  metadata?: Record<string, unknown>;
}

export interface InferenceEndpointJob {
  id: string;
  input: unknown;
  status?: string;
  events?: unknown[];
  create_time?: string;
  metadata?: Record<string, unknown>;
  webhook?: string;
}

export interface GpuClass {
  id: string;
  name: string;
  display_name?: string;
  descriptions?: string[];
  is_high_demand?: boolean;
  prices?: {
    priority?: string;
  };
}

export interface WebhookSecretKey {
  secret_key?: string;
}

export interface LogEntry {
  json_log?: Record<string, unknown>;
  parent_span_id?: string;
  receive_time: string;
  resource: {
    labels: Record<string, string>;
    type: string;
  };
  severity: 'default' | 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  span_Id?: string;
  text_log?: string;
  time: string;
  trace_Id?: string;
}

export interface LogEntryQuery {
  query: string;
  start_time: string;
  end_time: string;
  page_size?: number;
  sort_order?: 'asc' | 'desc';
}

export interface LogEntryCollection {
  items: LogEntry[];
  organization_name: string;
  page_max_time: string;
  page_min_time: string;
}

export interface AvailabilityRequest {
  gpu_classes?: string[];
  quantity?: number;
}

export class SaladAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'SaladAPIError';
  }
}

export class SaladClient {
  private client: AxiosInstance;

  constructor(config: SaladConfig) {
    // Get proxy from environment if available
    const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
    const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.salad.com/api/public',
      headers: {
        'Salad-Api-Key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      maxRedirects: 5,
      httpsAgent,
      proxy: false, // Disable axios default proxy, use httpsAgent instead
      validateStatus: (status: number) => status >= 200 && status < 500, // Accept 4xx for better error handling
    });
  }

  private handleError(error: unknown, response?: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const message = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;
      throw new SaladAPIError(
        message,
        axiosError.response?.status,
        axiosError.response?.data
      );
    }
    // Check if response has error status
    if (response && typeof response === 'object' && 'status' in response) {
      const statusCode = (response as { status: number }).status;
      if (statusCode >= 400) {
        throw new SaladAPIError(
          JSON.stringify(response),
          statusCode,
          response
        );
      }
    }
    throw error;
  }

  // Container Groups
  async listContainerGroups(
    organizationName: string,
    projectName: string
  ): Promise<{ items: ContainerGroup[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/containers`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<ContainerGroup> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroup: ContainerGroup
  ): Promise<ContainerGroup> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers`,
        containerGroup
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    updates: Partial<ContainerGroup>
  ): Promise<ContainerGroup> {
    try {
      const response = await this.client.patch(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}`,
        updates
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async startContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/start`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async stopContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/stop`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteContainerGroup(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getSystemLogs(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<string> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/system-logs`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Container Group Instances
  async listContainerGroupInstances(
    organizationName: string,
    projectName: string,
    containerGroupName: string
  ): Promise<{ items: ContainerGroupInstance[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getContainerGroupInstance(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    instanceId: string
  ): Promise<ContainerGroupInstance> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances/${instanceId}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateContainerGroupInstance(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    instanceId: string,
    updates: Partial<ContainerGroupInstance>
  ): Promise<ContainerGroupInstance> {
    try {
      const response = await this.client.patch(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances/${instanceId}`,
        updates
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async reallocateContainerGroupInstance(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    instanceId: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances/${instanceId}/reallocate`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async recreateContainerGroupInstance(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    instanceId: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances/${instanceId}/recreate`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async restartContainerGroupInstance(
    organizationName: string,
    projectName: string,
    containerGroupName: string,
    instanceId: string
  ): Promise<void> {
    try {
      await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/containers/${containerGroupName}/instances/${instanceId}/restart`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Inference Endpoints
  async listInferenceEndpoints(
    organizationName: string
  ): Promise<{ items: InferenceEndpoint[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/inference-endpoints`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getInferenceEndpoint(
    organizationName: string,
    inferenceEndpointName: string
  ): Promise<InferenceEndpoint> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/inference-endpoints/${inferenceEndpointName}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Inference Endpoint Jobs
  async listInferenceEndpointJobs(
    organizationName: string,
    inferenceEndpointName: string
  ): Promise<{ items: InferenceEndpointJob[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/inference-endpoints/${inferenceEndpointName}/jobs`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createInferenceEndpointJob(
    organizationName: string,
    inferenceEndpointName: string,
    job: { input: unknown; metadata?: Record<string, unknown>; webhook?: string }
  ): Promise<InferenceEndpointJob> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/inference-endpoints/${inferenceEndpointName}/jobs`,
        job
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getInferenceEndpointJob(
    organizationName: string,
    inferenceEndpointName: string,
    jobId: string
  ): Promise<InferenceEndpointJob> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/inference-endpoints/${inferenceEndpointName}/jobs/${jobId}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteInferenceEndpointJob(
    organizationName: string,
    inferenceEndpointName: string,
    jobId: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/organizations/${organizationName}/inference-endpoints/${inferenceEndpointName}/jobs/${jobId}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Queues
  async listQueues(
    organizationName: string,
    projectName: string
  ): Promise<{ items: Queue[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/queues`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getQueue(
    organizationName: string,
    projectName: string,
    queueName: string
  ): Promise<Queue> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createQueue(
    organizationName: string,
    projectName: string,
    queue: Queue
  ): Promise<Queue> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/queues`,
        queue
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateQueue(
    organizationName: string,
    projectName: string,
    queueName: string,
    updates: Partial<Queue>
  ): Promise<Queue> {
    try {
      const response = await this.client.patch(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}`,
        updates
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteQueue(
    organizationName: string,
    projectName: string,
    queueName: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Queue Jobs
  async listQueueJobs(
    organizationName: string,
    projectName: string,
    queueName: string
  ): Promise<{ items: QueueJob[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}/jobs`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createQueueJob(
    organizationName: string,
    projectName: string,
    queueName: string,
    job: { input: unknown; metadata?: Record<string, unknown>; webhook?: string }
  ): Promise<QueueJob> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}/jobs`,
        job
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getQueueJob(
    organizationName: string,
    projectName: string,
    queueName: string,
    jobId: string
  ): Promise<QueueJob> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}/jobs/${jobId}`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteQueueJob(
    organizationName: string,
    projectName: string,
    queueName: string,
    jobId: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/organizations/${organizationName}/projects/${projectName}/queues/${queueName}/jobs/${jobId}`
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Quotas
  async getQuotas(organizationName: string): Promise<Quotas> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/quotas`
      );
      if (response.status >= 400) {
        return this.handleError(new Error('API Error'), response.data);
      }
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // GPU Classes
  async listGpuClasses(
    organizationName: string
  ): Promise<{ items: GpuClass[] }> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/gpu-classes`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Webhooks
  async getWebhookSecretKey(
    organizationName: string
  ): Promise<WebhookSecretKey> {
    try {
      const response = await this.client.get(
        `/organizations/${organizationName}/webhook-secret-key`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateWebhookSecretKey(
    organizationName: string
  ): Promise<WebhookSecretKey> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/webhook-secret-key`
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Log Entries
  async queryLogEntries(
    organizationName: string,
    query: LogEntryQuery
  ): Promise<LogEntryCollection> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/log-entries`,
        query
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Availability
  async getCpuAvailability(
    organizationName: string,
    request?: AvailabilityRequest
  ): Promise<unknown> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/availability/sce-cpu-availability`,
        request || {}
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getGpuAvailability(
    organizationName: string,
    request?: AvailabilityRequest
  ): Promise<unknown> {
    try {
      const response = await this.client.post(
        `/organizations/${organizationName}/availability/sce-gpu-availability`,
        request || {}
      );
      return response.data;
    } catch (error) {
      return this.handleError(error);
    }
  }
}
