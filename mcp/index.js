import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "../cli/fastset-dex-agent-cli.mjs");
const execFileAsync = promisify(execFile);

const server = new Server(
    {
        name: "fastset-dex-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

async function runCliCommand(commandArgs) {
    try {
        const { stdout, stderr } = await execFileAsync("node", [CLI_PATH, ...commandArgs]);
        return { stdout, stderr };
    } catch (error) {
        if (error.stdout || error.stderr) {
            return { stdout: error.stdout, stderr: error.stderr };
        }
        throw error;
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "gen-test-keypair",
                description: "Generate a test ed25519 keypair and address for testing.",
                inputSchema: { type: "object", properties: {}, required: [] },
            },
            {
                name: "faucet-drip",
                description: "Request free tokens from the testnet faucet.",
                inputSchema: {
                    type: "object",
                    properties: {
                        recipient: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array address of the recipient",
                        },
                        amount: {
                            type: "string",
                            description: "Amount to drip in atomic units",
                        },
                        token_id: {
                            type: "array",
                            items: { type: "integer" },
                            description: "Optional 32-byte array for the token ID",
                        },
                    },
                    required: ["recipient", "amount"],
                },
            },
            {
                name: "pool-info",
                description: "Get information about a specific liquidity pool.",
                inputSchema: {
                    type: "object",
                    properties: {
                        tokenA: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array of Token A ID",
                        },
                        tokenB: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array of Token B ID",
                        },
                    },
                    required: ["tokenA", "tokenB"],
                },
            },
            {
                name: "account-info",
                description: "Get the nonce and balanced information for a given address.",
                inputSchema: {
                    type: "object",
                    properties: {
                        address: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array address",
                        },
                    },
                    required: ["address"],
                },
            },
            {
                name: "signed-token-transfer",
                description: "Execute a signed token transfer transaction.",
                inputSchema: {
                    type: "object",
                    properties: {
                        privateKeyHex: {
                            type: "string",
                            description: "64-character hex string of the private key",
                        },
                        recipient: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array address of the recipient",
                        },
                        tokenId: {
                            type: "array",
                            items: { type: "integer" },
                            description: "32-byte array of the token ID",
                        },
                        amountAtomic: {
                            type: "string",
                            description: "Amount to transfer in atomic units",
                        },
                    },
                    required: ["privateKeyHex", "recipient", "tokenId", "amountAtomic"],
                },
            }
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments;
    let cliArgs = [];

    if (toolName === "gen-test-keypair") {
        cliArgs = ["gen-test-keypair"];
    } else if (toolName === "faucet-drip") {
        cliArgs = ["faucet-drip", "--body-json", JSON.stringify(args)];
    } else if (toolName === "pool-info") {
        cliArgs = ["call", "pool-info", "--body-json", JSON.stringify(args)];
    } else if (toolName === "account-info") {
        cliArgs = ["call", "account-info", "--body-json", JSON.stringify(args)];
    } else if (toolName === "signed-token-transfer") {
        cliArgs = ["signed-token-transfer", "--body-json", JSON.stringify(args)];
    } else {
        throw new Error(`Unknown tool: ${toolName}`);
    }

    const { stdout, stderr } = await runCliCommand(cliArgs);

    // if output is mainly empty strings but there's a valid code execution, return stdout. Error gets populated appropriately.
    return {
        content: [
            {
                type: "text",
                text: stdout ? stdout : stderr || "No output",
            },
        ],
        isError: !stdout && !!stderr,
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Fastset DEX MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
