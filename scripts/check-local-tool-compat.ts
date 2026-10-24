import { qwenChatCompletion } from "../lib/ai/qwen-client";
async function main() {
const started = Date.now();
const response = await qwenChatCompletion({ max_tokens: 64, temperature: 0, tool_choice: "required",
  tools: [{ type: "function", function: { name: "confirm_contract", parameters: { type: "object", properties: { supported: { type: "boolean" } }, required: ["supported"], additionalProperties: false } } }],
  messages: [{ role: "user", content: "请仅调用confirm_contract，参数supported=true。" }],
}, { stage: "structure-compat", timeoutMs: 30000 });
const calls = response.choices?.[0]?.message?.tool_calls || [];
const pass = calls.length === 1 && calls[0].function?.name === "confirm_contract" && JSON.parse(calls[0].function.arguments).supported === true;
console.log(JSON.stringify({ type: "real-local-model-contract", pass, elapsedMs: Date.now() - started, toolChoice: "required", calls }, null, 2));
if (!pass) process.exitCode = 1;
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
