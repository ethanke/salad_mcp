#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SaladClient, ContainerGroup, Queue } from './salad-client.js';
import { z } from 'zod';

const SALAD_API_KEY = process.env.SALAD_API_KEY;

if (!SALAD_API_KEY) {
  console.error('Error: SALAD_API_KEY environment variable is required');
  process.exit(1);
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
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
      },
      required: ['organization_name', 'project_name'],
    },
  },
  {
    name: 'get_container_group',
    description:
      'Get detailed information about a specific container group including its configuration, status, and instances.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name',
        },
      },
      required: ['organization_name', 'project_name', 'container_group_name'],
    },
  },
  {
    name: 'create_container_group',
    description:
      'Create a new container group with specified configuration including image, resources (CPU, memory, GPU), networking, and other settings.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
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
      required: ['organization_name', 'project_name', 'container_group'],
    },
  },
  {
    name: 'update_container_group',
    description:
      'Update an existing container group. You can modify replicas, resources, networking, environment variables, and other configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
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
        'organization_name',
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
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to start',
        },
      },
      required: ['organization_name', 'project_name', 'container_group_name'],
    },
  },
  {
    name: 'stop_container_group',
    description:
      'Stop a running container group. This will deallocate resources and stop all running containers.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to stop',
        },
      },
      required: ['organization_name', 'project_name', 'container_group_name'],
    },
  },
  {
    name: 'delete_container_group',
    description:
      'Delete a container group permanently. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        container_group_name: {
          type: 'string',
          description: 'The container group name to delete',
        },
      },
      required: ['organization_name', 'project_name', 'container_group_name'],
    },
  },
  {
    name: 'list_inference_endpoints',
    description:
      'List all available inference endpoints in an organization. Inference endpoints provide ready-to-use AI model APIs.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
      },
      required: ['organization_name'],
    },
  },
  {
    name: 'get_inference_endpoint',
    description:
      'Get detailed information about a specific inference endpoint including its configuration and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        inference_endpoint_name: {
          type: 'string',
          description: 'The inference endpoint name',
        },
      },
      required: ['organization_name', 'inference_endpoint_name'],
    },
  },
  {
    name: 'list_queues',
    description:
      'List all message queues in a project. Queues enable asynchronous workload processing.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
      },
      required: ['organization_name', 'project_name'],
    },
  },
  {
    name: 'get_queue',
    description: 'Get detailed information about a specific message queue.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name',
        },
      },
      required: ['organization_name', 'project_name', 'queue_name'],
    },
  },
  {
    name: 'create_queue',
    description:
      'Create a new message queue for asynchronous workload processing.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue: {
          type: 'object',
          description: 'The queue configuration including name and description',
        },
      },
      required: ['organization_name', 'project_name', 'queue'],
    },
  },
  {
    name: 'delete_queue',
    description: 'Delete a message queue permanently. This action cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
        project_name: {
          type: 'string',
          description: 'The project name',
        },
        queue_name: {
          type: 'string',
          description: 'The queue name to delete',
        },
      },
      required: ['organization_name', 'project_name', 'queue_name'],
    },
  },
  {
    name: 'get_quotas',
    description:
      'Get organization resource quotas including limits on container groups, instances, and reallocations.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_name: {
          type: 'string',
          description: 'The organization name',
        },
      },
      required: ['organization_name'],
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string,
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
          args.organization_name as string
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
