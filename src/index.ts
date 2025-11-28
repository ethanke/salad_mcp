#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  SaladClient,
  ContainerGroup,
  Queue,
  ContainerGroupInstance,
  QueueJob,
  InferenceEndpointJob,
  GpuClass,
  WebhookSecretKey,
  LogEntry,
  LogEntryQuery,
  LogEntryCollection,
} from './salad-client.js';
import { z } from 'zod';

const SALAD_API_KEY = process.env.SALAD_API_KEY || 'placeholder-key';
const SALAD_ORG_NAME = process.env.SALAD_ORG_NAME || 'placeholder-org';

// Warn but don't exit if keys are missing (allows discovery tools to run)
if (!process.env.SALAD_API_KEY) {
  console.error('Warning: SALAD_API_KEY environment variable is not set. API calls will fail.');
}

if (!process.env.SALAD_ORG_NAME) {
  console.error('Warning: SALAD_ORG_NAME environment variable is not set. API calls will fail.');
}

const saladClient = new SaladClient({ apiKey: SALAD_API_KEY });

// Define tools
const TOOLS: Tool[] = [
  {
    name: 'list_container_groups',
    description:
      'List all container groups in a SaladCloud organization and project. Container groups represent scalable sets of identical containers running as distributed services.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_container_group',
    description:
      'Get detailed information about a specific container group including its configuration, status, and instances.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'create_container_group',
    description:
      'Create a new container group with specified configuration including image, resources (CPU, memory, GPU), networking, and other settings.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group: {
          type: 'object',
          description:
            'The container group configuration including name, container image, resources, replicas, networking, etc.',
        },
      },
      required: ['project_name', 'container_group'],
    },
  },
  {
    name: 'update_container_group',
    description:
      'Update an existing container group. You can modify replicas, resources, networking, environment variables, and other configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to update',
        },
        updates: {
          type: 'object',
          description: 'The fields to update',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'updates',
      ],
    },
  },
  {
    name: 'start_container_group',
    description:
      'Start a stopped container group. This will allocate resources and begin running the containers.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to start',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'stop_container_group',
    description:
      'Stop a running container group. This will deallocate resources and stop all running containers.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to stop',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'delete_container_group',
    description:
      'Delete a container group permanently. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to delete',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'list_inference_endpoints',
    description:
      'List all available inference endpoints in an organization. Inference endpoints provide ready-to-use AI model APIs.',
    inputSchema: {
      type: 'object',
      properties: {
      },
      required: [],
    },
  },
  {
    name: 'get_inference_endpoint',
    description:
      'Get detailed information about a specific inference endpoint including its configuration and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
      },
      required: ['inference_endpoint_name'],
    },
  },
  {
    name: 'list_queues',
    description:
      'List all message queues in a project. Queues enable asynchronous workload processing.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'get_queue',
    description: 'Get detailed information about a specific message queue.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
      },
      required: ['project_name', 'queue_name'],
    },
  },
  {
    name: 'create_queue',
    description:
      'Create a new message queue for asynchronous workload processing.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue: {
          type: 'object',
          description: 'The queue configuration including name and description',
        },
      },
      required: ['project_name', 'queue'],
    },
  },
  {
    name: 'delete_queue',
    description: 'Delete a message queue permanently. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name to delete',
        },
      },
      required: ['project_name', 'queue_name'],
    },
  },
  {
    name: 'get_quotas',
    description:
      'Get organization resource quotas including limits on container groups, instances, and reallocations.',
    inputSchema: {
      type: 'object',
      properties: {
      },
      required: [],
    },
  },
  {
    name: 'get_system_logs',
    description:
      'Get system logs for a container group. Returns logs from container group system events.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'list_container_group_instances',
    description:
      'List all instances of a container group. Instances represent individual running containers within a group.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
      },
      required: ['project_name', 'container_group_name'],
    },
  },
  {
    name: 'get_container_group_instance',
    description:
      'Get detailed information about a specific container group instance.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
        instance_id: {
          type: 'string',
          description: 'The instance ID',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'instance_id',
      ],
    },
  },
  {
    name: 'update_container_group_instance',
    description:
      'Update a container group instance. Can be used to modify instance settings like deletion cost.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
        instance_id: {
          type: 'string',
          description: 'The instance ID',
        },
        updates: {
          type: 'object',
          description: 'The fields to update',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'instance_id',
        'updates',
      ],
    },
  },
  {
    name: 'reallocate_container_group_instance',
    description:
      'Reallocate a container group instance to a different machine.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
        instance_id: {
          type: 'string',
          description: 'The instance ID',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'instance_id',
      ],
    },
  },
  {
    name: 'recreate_container_group_instance',
    description:
      'Recreate a container group instance on the same machine.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
        instance_id: {
          type: 'string',
          description: 'The instance ID',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'instance_id',
      ],
    },
  },
  {
    name: 'restart_container_group_instance',
    description: 'Restart a container group instance.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
        instance_id: {
          type: 'string',
          description: 'The instance ID',
        },
      },
      required: [
        'project_name',
        'container_group_name',
        'instance_id',
      ],
    },
  },
  {
    name: 'update_queue',
    description: 'Update a message queue configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
        updates: {
          type: 'object',
          description: 'The fields to update',
        },
      },
      required: ['project_name', 'queue_name', 'updates'],
    },
  },
  {
    name: 'list_queue_jobs',
    description: 'List all jobs in a message queue.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
      },
      required: ['project_name', 'queue_name'],
    },
  },
  {
    name: 'create_queue_job',
    description: 'Create a new job in a message queue.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
        job: {
          type: 'object',
          description: 'The job data including input and optional metadata',
        },
      },
      required: ['project_name', 'queue_name', 'job'],
    },
  },
  {
    name: 'get_queue_job',
    description: 'Get detailed information about a specific queue job.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
        job_id: {
          type: 'string',
          description: 'The job ID',
        },
      },
      required: ['project_name', 'queue_name', 'job_id'],
    },
  },
  {
    name: 'delete_queue_job',
    description: 'Delete a job from a message queue.',
    inputSchema: {
      type: 'object',
      properties: {
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
        job_id: {
          type: 'string',
          description: 'The job ID',
        },
      },
      required: ['project_name', 'queue_name', 'job_id'],
    },
  },
  {
    name: 'list_inference_endpoint_jobs',
    description: 'List all jobs for a specific inference endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
      },
      required: ['inference_endpoint_name'],
    },
  },
  {
    name: 'create_inference_endpoint_job',
    description: 'Create a new inference job for an endpoint.',
    inputSchema: {
      type: 'object',
      properties: {
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
        job: {
          type: 'object',
          description: 'The job data including input and optional metadata',
        },
      },
      required: ['inference_endpoint_name', 'job'],
    },
  },
  {
    name: 'get_inference_endpoint_job',
    description: 'Get detailed information about a specific inference job.',
    inputSchema: {
      type: 'object',
      properties: {
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
        job_id: {
          type: 'string',
          description: 'The job ID',
        },
      },
      required: ['inference_endpoint_name', 'job_id'],
    },
  },
  {
    name: 'delete_inference_endpoint_job',
    description: 'Delete an inference job.',
    inputSchema: {
      type: 'object',
      properties: {
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
        job_id: {
          type: 'string',
          description: 'The job ID',
        },
      },
      required: ['inference_endpoint_name', 'job_id'],
    },
  },
  {
    name: 'list_gpu_classes',
    description:
      'List all available GPU classes for an organization. GPU classes define the types of GPUs available for container groups.',
    inputSchema: {
      type: 'object',
      properties: {
      },
      required: [],
    },
  },
  {
    name: 'get_webhook_secret_key',
    description:
      'Get the webhook secret key for an organization. Used to verify webhook payloads.',
    inputSchema: {
      type: 'object',
      properties: {
      },
      required: [],
    },
  },
  {
    name: 'update_webhook_secret_key',
    description:
      'Regenerate the webhook secret key for an organization.',
    inputSchema: {
      type: 'object',
      properties: {
      },
      required: [],
    },
  },
  {
    name: 'query_log_entries',
    description:
      'Query log entries for an organization. Retrieve logs matching a query string within a specified time range. Supports pagination and sorting.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'object',
          description: 'Log query object with query string, time range, and optional pagination/sorting parameters',
          properties: {
            query: {
              type: 'string',
              description: 'The query string for filtering logs (max 20,000 characters)',
            },
            start_time: {
              type: 'string',
              description: 'The start time of the time range (ISO 8601 format, e.g., "2023-11-07T05:31:56Z")',
            },
            end_time: {
              type: 'string',
              description: 'The end time of the time range (ISO 8601 format, e.g., "2023-11-07T05:31:56Z")',
            },
            page_size: {
              type: 'number',
              description: 'The maximum number of items per page (1-100, default varies)',
            },
            sort_order: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'The sort order of log entries: "asc" for chronological, "desc" for reverse chronological (default: "desc")',
            },
          },
          required: ['query', 'start_time', 'end_time'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_cpu_availability',
    description:
      'Get CPU availability information for an organization. Returns available CPU resources.',
    inputSchema: {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          description: 'Optional availability request parameters',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_gpu_availability',
    description:
      'Get GPU availability information for an organization. Returns available GPU resources by class.',
    inputSchema: {
      type: 'object',
      properties: {
        request: {
          type: 'object',
          description:
            'Optional availability request parameters including gpu_classes and quantity',
        },
      },
      required: [],
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'salad-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Missing arguments',
        },
      ],
      isError: true,
    };
  }

  try {
    switch (name) {
      case 'list_container_groups': {
        const result = await saladClient.listContainerGroups(
          SALAD_ORG_NAME,
          args.project_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_container_group': {
        const result = await saladClient.getContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_container_group': {
        const result = await saladClient.createContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group as ContainerGroup
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_container_group': {
        const result = await saladClient.updateContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.updates as Partial<ContainerGroup>
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'start_container_group': {
        await saladClient.startContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group ${args.container_group_name} started successfully`,
            },
          ],
        };
      }

      case 'stop_container_group': {
        await saladClient.stopContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group ${args.container_group_name} stopped successfully`,
            },
          ],
        };
      }

      case 'delete_container_group': {
        await saladClient.deleteContainerGroup(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group ${args.container_group_name} deleted successfully`,
            },
          ],
        };
      }

      case 'list_inference_endpoints': {
        const result = await saladClient.listInferenceEndpoints(
          SALAD_ORG_NAME
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_inference_endpoint': {
        const result = await saladClient.getInferenceEndpoint(
          SALAD_ORG_NAME,
          args.inference_endpoint_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_queues': {
        const result = await saladClient.listQueues(
          SALAD_ORG_NAME,
          args.project_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_queue': {
        const result = await saladClient.getQueue(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_queue': {
        const result = await saladClient.createQueue(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue as Queue
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_queue': {
        await saladClient.deleteQueue(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Queue ${args.queue_name} deleted successfully`,
            },
          ],
        };
      }

      case 'get_quotas': {
        const result = await saladClient.getQuotas(
          SALAD_ORG_NAME
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_system_logs': {
        const result = await saladClient.getSystemLogs(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_container_group_instances': {
        const result = await saladClient.listContainerGroupInstances(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_container_group_instance': {
        const result = await saladClient.getContainerGroupInstance(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.instance_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_container_group_instance': {
        const result = await saladClient.updateContainerGroupInstance(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.instance_id as string,
          args.updates as Partial<ContainerGroupInstance>
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'reallocate_container_group_instance': {
        await saladClient.reallocateContainerGroupInstance(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.instance_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group instance ${args.instance_id} reallocated successfully`,
            },
          ],
        };
      }

      case 'recreate_container_group_instance': {
        await saladClient.recreateContainerGroupInstance(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.instance_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group instance ${args.instance_id} recreated successfully`,
            },
          ],
        };
      }

      case 'restart_container_group_instance': {
        await saladClient.restartContainerGroupInstance(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.container_group_name as string,
          args.instance_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Container group instance ${args.instance_id} restarted successfully`,
            },
          ],
        };
      }

      case 'update_queue': {
        const result = await saladClient.updateQueue(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string,
          args.updates as Partial<Queue>
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'list_queue_jobs': {
        const result = await saladClient.listQueueJobs(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_queue_job': {
        const result = await saladClient.createQueueJob(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string,
          args.job as { input: unknown; metadata?: Record<string, unknown>; webhook?: string }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_queue_job': {
        const result = await saladClient.getQueueJob(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string,
          args.job_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_queue_job': {
        await saladClient.deleteQueueJob(
          SALAD_ORG_NAME,
          args.project_name as string,
          args.queue_name as string,
          args.job_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Queue job ${args.job_id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_inference_endpoint_jobs': {
        const result = await saladClient.listInferenceEndpointJobs(
          SALAD_ORG_NAME,
          args.inference_endpoint_name as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_inference_endpoint_job': {
        const result = await saladClient.createInferenceEndpointJob(
          SALAD_ORG_NAME,
          args.inference_endpoint_name as string,
          args.job as { input: unknown; metadata?: Record<string, unknown>; webhook?: string }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_inference_endpoint_job': {
        const result = await saladClient.getInferenceEndpointJob(
          SALAD_ORG_NAME,
          args.inference_endpoint_name as string,
          args.job_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'delete_inference_endpoint_job': {
        await saladClient.deleteInferenceEndpointJob(
          SALAD_ORG_NAME,
          args.inference_endpoint_name as string,
          args.job_id as string
        );
        return {
          content: [
            {
              type: 'text',
              text: `Inference endpoint job ${args.job_id} deleted successfully`,
            },
          ],
        };
      }

      case 'list_gpu_classes': {
        const result = await saladClient.listGpuClasses(
          SALAD_ORG_NAME
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_webhook_secret_key': {
        const result = await saladClient.getWebhookSecretKey(
          SALAD_ORG_NAME
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'update_webhook_secret_key': {
        const result = await saladClient.updateWebhookSecretKey(
          SALAD_ORG_NAME
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'query_log_entries': {
        const result = await saladClient.queryLogEntries(
          SALAD_ORG_NAME,
          args.query as LogEntryQuery
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_cpu_availability': {
        const result = await saladClient.getCpuAvailability(
          SALAD_ORG_NAME,
          args.request as { gpu_classes?: string[]; quantity?: number } | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_gpu_availability': {
        const result = await saladClient.getGpuAvailability(
          SALAD_ORG_NAME,
          args.request as { gpu_classes?: string[]; quantity?: number } | undefined
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salad MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
