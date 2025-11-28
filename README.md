# Salad MCP Server

[![npm version](https://badge.fury.io/js/salad-mcp-server.svg)](https://www.npmjs.com/package/salad-mcp-server)
[![smithery badge](https://smithery.ai/badge/salad-mcp-server)](https://smithery.ai/server/salad-mcp-server)

A Model Context Protocol (MCP) server for [SaladCloud](https://salad.com) - the GPU provider with super nice features!

This MCP server provides seamless integration with SaladCloud's API, enabling Claude and other MCP clients to manage GPU workloads, container groups, inference endpoints, and more.

## Features

- **Container Groups Management**: Create, list, update, start, stop, and delete container groups
- **Inference Endpoints**: List and manage inference endpoints
- **Queue Operations**: Manage message queues for async workload processing
- **Logs & Monitoring**: Access system logs and workload errors
- **Quotas**: Check organization resource quotas
- **LLM-as-Judge Auto-Eval**: Comprehensive integration testing using Claude API

## Installation

### Quick Start (Recommended)

Use npx to run without installation:

```bash
npx salad-mcp-server
```

### Via Smithery

To install with [Smithery](https://smithery.ai/server/salad-mcp-server):

```bash
npx -y @smithery/cli install salad-mcp-server --client claude
```

### From npm

```bash
npm install -g salad-mcp-server
salad-mcp-server
```

### From Source

```bash
npm install
npm run build
```

## Configuration

Set your SaladCloud API key as an environment variable:

```bash
export SALAD_API_KEY=your_api_key_here
export SALAD_ORG_NAME=your_organization_name
```

For auto-eval testing, also set:

```bash
export CLAUDE_API_KEY=your_claude_api_key_here
```

## Usage

### As MCP Server

Add to your MCP client configuration (e.g., Claude Desktop):

**Using npx (recommended):**

```json
{
  "mcpServers": {
    "salad": {
      "command": "npx",
      "args": ["salad-mcp-server"],
      "env": {
        "SALAD_API_KEY": "your_api_key_here",
        "SALAD_ORG_NAME": "your_organization_name"
      }
    }
  }
}
```

**Using local installation:**

```json
{
  "mcpServers": {
    "salad": {
      "command": "node",
      "args": ["/path/to/salad_mcp/dist/index.js"],
      "env": {
        "SALAD_API_KEY": "your_api_key_here",
        "SALAD_ORG_NAME": "your_organization_name"
      }
    }
  }
}
```

### Run Auto-Eval CLI

Test the full integration with LLM-as-judge evaluation:

```bash
npm run eval
```

### Run Integration Tests

```bash
npm test
```

## Available Tools

- `list_container_groups`: List all container groups in an organization/project
- `get_container_group`: Get details of a specific container group
- `create_container_group`: Create a new container group
- `update_container_group`: Update an existing container group
- `start_container_group`: Start a container group
- `stop_container_group`: Stop a container group
- `delete_container_group`: Delete a container group
- `list_inference_endpoints`: List available inference endpoints
- `get_quotas`: Get organization resource quotas
- `list_queues`: List message queues
- `create_queue`: Create a new message queue
- `get_queue`: Get queue details
- `delete_queue`: Delete a queue

## API Reference

Based on [SaladCloud API Documentation](https://docs.salad.com/reference/api-usage)

## Sources

- [SaladCloud API Documentation](https://docs.salad.com/reference/api-usage)
- [Container Groups API](https://docs.salad.com/reference/saladcloud-api/container-groups/)
- [SaladCloud Python SDK](https://github.com/SaladTechnologies/salad-cloud-sdk-python)

## License

MIT
