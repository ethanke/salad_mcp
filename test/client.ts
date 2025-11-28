import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

console.log("SALAD_API_KEY present:", !!process.env.SALAD_API_KEY);

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: [path.resolve(__dirname, "../dist/index.js")],
        env: process.env as Record<string, string>,
    });

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    await client.connect(transport);
    console.log("Connected to server");

    try {
        // const tools = await client.request(ListToolsResultSchema, {});
        // console.log(`Found ${tools.tools.length} tools`);

        // for (const tool of tools.tools) {
        //     console.log(`- ${tool.name}`);
        // }

        const orgName = process.env.SALAD_ORG_NAME || "lumai";
        const projectName = process.env.SALAD_PROJECT_NAME || "lum-tools";

        console.log(`Testing with Org: ${orgName}, Project: ${projectName}`);

        // Test get_quotas
        try {
            console.log("\nTesting get_quotas...");
            const quotas = await client.callTool({
                name: "get_quotas",
                arguments: {
                    organization_name: orgName,
                }
            });
            console.log("get_quotas result:", JSON.stringify(quotas, null, 2));
        } catch (e) {
            console.error("get_quotas failed:", e);
        }

        // Test list_container_groups
        let containerGroupName = "";
        try {
            console.log("\nTesting list_container_groups...");
            const groups = await client.callTool({
                name: "list_container_groups",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                }
            });
            console.log("list_container_groups result:", JSON.stringify(groups, null, 2));
            // @ts-ignore
            const items = JSON.parse(groups.content[0].text).items;
            if (items && items.length > 0) {
                containerGroupName = items[0].name;
            }
        } catch (e) {
            console.error("list_container_groups failed:", e);
        }

        // Test list_queues
        let queueName = "";
        try {
            console.log("\nTesting list_queues...");
            const queues = await client.callTool({
                name: "list_queues",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                }
            });
            console.log("list_queues result:", JSON.stringify(queues, null, 2));
            // @ts-ignore
            const items = JSON.parse(queues.content[0].text).items;
            if (items && items.length > 0) {
                queueName = items[0].name;
            }
        } catch (e) {
            console.error("list_queues failed:", e);
        }

        // Test list_inference_endpoints
        let inferenceEndpointName = "";
        try {
            console.log("\nTesting list_inference_endpoints...");
            const endpoints = await client.callTool({
                name: "list_inference_endpoints",
                arguments: {
                    organization_name: orgName,
                }
            });
            console.log("list_inference_endpoints result:", JSON.stringify(endpoints, null, 2));
            // @ts-ignore
            const items = JSON.parse(endpoints.content[0].text).items;
            if (items && items.length > 0) {
                inferenceEndpointName = items[0].name;
            }
        } catch (e) {
            console.error("list_inference_endpoints failed:", e);
        }

        // Test list_gpu_classes
        let gpuClassId = "";
        try {
            console.log("\nTesting list_gpu_classes...");
            const gpuClasses = await client.callTool({
                name: "list_gpu_classes",
                arguments: {
                    organization_name: orgName,
                }
            });
            console.log("list_gpu_classes result:", JSON.stringify(gpuClasses, null, 2));
            // @ts-ignore
            const items = JSON.parse(gpuClasses.content[0].text).items;
            if (items && items.length > 0) {
                gpuClassId = items[0].id;
            }
        } catch (e) {
            console.error("list_gpu_classes failed:", e);
        }

        // Test get_webhook_secret_key
        try {
            console.log("\nTesting get_webhook_secret_key...");
            const secret = await client.callTool({
                name: "get_webhook_secret_key",
                arguments: {
                    organization_name: orgName,
                }
            });
            console.log("get_webhook_secret_key result:", JSON.stringify(secret, null, 2));
        } catch (e) {
            console.error("get_webhook_secret_key failed:", e);
        }

        // Test get_cpu_availability
        try {
            console.log("\nTesting get_cpu_availability...");
            const cpuAvail = await client.callTool({
                name: "get_cpu_availability",
                arguments: {
                    organization_name: orgName,
                }
            });
            console.log("get_cpu_availability result:", JSON.stringify(cpuAvail, null, 2));
        } catch (e) {
            console.error("get_cpu_availability failed:", e);
        }

        // Test get_gpu_availability
        try {
            console.log("\nTesting get_gpu_availability...");
            const args: any = {
                organization_name: orgName,
            };
            if (gpuClassId) {
                args.request = {
                    gpu_classes: [gpuClassId],
                };
            }
            const gpuAvail = await client.callTool({
                name: "get_gpu_availability",
                arguments: args
            });
            console.log("get_gpu_availability result:", JSON.stringify(gpuAvail, null, 2));
        } catch (e) {
            console.error("get_gpu_availability failed:", e);
        }

        // Test get_container_group
        if (containerGroupName) {
            try {
                console.log(`\nTesting get_container_group for ${containerGroupName}...`);
                const group = await client.callTool({
                    name: "get_container_group",
                    arguments: {
                        organization_name: orgName,
                        project_name: projectName,
                        container_group_name: containerGroupName,
                    }
                });
                console.log("get_container_group result:", JSON.stringify(group, null, 2));
            } catch (e) {
                console.error("get_container_group failed:", e);
            }
        }

        // Test get_queue
        if (queueName) {
            try {
                console.log(`\nTesting get_queue for ${queueName}...`);
                const queue = await client.callTool({
                    name: "get_queue",
                    arguments: {
                        organization_name: orgName,
                        project_name: projectName,
                        queue_name: queueName,
                    }
                });
                console.log("get_queue result:", JSON.stringify(queue, null, 2));
            } catch (e) {
                console.error("get_queue failed:", e);
            }
        }

        // Test get_inference_endpoint
        if (inferenceEndpointName) {
            try {
                console.log(`\nTesting get_inference_endpoint for ${inferenceEndpointName}...`);
                const endpoint = await client.callTool({
                    name: "get_inference_endpoint",
                    arguments: {
                        organization_name: orgName,
                        inference_endpoint_name: inferenceEndpointName,
                    }
                });
                console.log("get_inference_endpoint result:", JSON.stringify(endpoint, null, 2));
            } catch (e) {
                console.error("get_inference_endpoint failed:", e);
            }
        }

        // Test Queue Lifecycle
        const testQueueName = `test-queue-${Math.floor(Math.random() * 10000)}`;
        try {
            console.log(`\nTesting create_queue ${testQueueName}...`);
            const queue = await client.callTool({
                name: "create_queue",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                    queue: {
                        name: testQueueName,
                        display_name: "Test Queue",
                        description: "Created by MCP Test Client"
                    }
                }
            });
            console.log("create_queue result:", JSON.stringify(queue, null, 2));

            // Create Job
            console.log("\nTesting create_queue_job...");
            const job = await client.callTool({
                name: "create_queue_job",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                    queue_name: testQueueName,
                    job: {
                        input: { message: "hello" },
                        metadata: { test: true }
                    }
                }
            });
            console.log("create_queue_job result:", JSON.stringify(job, null, 2));
            // @ts-ignore
            const jobId = JSON.parse(job.content[0].text).id;

            // Get Job
            console.log(`\nTesting get_queue_job ${jobId}...`);
            const fetchedJob = await client.callTool({
                name: "get_queue_job",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                    queue_name: testQueueName,
                    job_id: jobId
                }
            });
            console.log("get_queue_job result:", JSON.stringify(fetchedJob, null, 2));

            // Delete Job
            console.log(`\nTesting delete_queue_job ${jobId}...`);
            const deletedJob = await client.callTool({
                name: "delete_queue_job",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                    queue_name: testQueueName,
                    job_id: jobId
                }
            });
            console.log("delete_queue_job result:", JSON.stringify(deletedJob, null, 2));

            // Delete Queue
            console.log(`\nTesting delete_queue ${testQueueName}...`);
            const deletedQueue = await client.callTool({
                name: "delete_queue",
                arguments: {
                    organization_name: orgName,
                    project_name: projectName,
                    queue_name: testQueueName
                }
            });
            console.log("delete_queue result:", JSON.stringify(deletedQueue, null, 2));

        } catch (e) {
            console.error("Queue lifecycle failed:", e);
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
