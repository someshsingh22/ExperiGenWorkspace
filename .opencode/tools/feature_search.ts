import { tool } from "@opencode-ai/plugin"
import path from "path"

export default tool({
    description: "Search previously extracted features by semantic similarity. Given a natural-language query describing a feature of interest, returns the top-k most similar features already in the registry (with name, description, types, and similarity score). Use this BEFORE calling feature_extractor to check if an equivalent feature has already been extracted — avoids redundant LLM extraction cost. Returns an empty list if no features exist yet.",
    args: {
        query: tool.schema.string().describe("Natural-language description of the feature you are looking for (e.g., 'does the comment use respectful tone', 'sentiment of the text')"),
        top_k: tool.schema.number().optional().describe("Number of similar features to return (default: 3)")
    },
    async execute(args, context) {
        const experigenRoot = "/dev/shm/somesh/experigen"
        const script = path.join(experigenRoot, "experigen/algorithm/tools/feature_search_cli.py")
        const csv_path = process.env.EXPERIGEN_CSV_PATH
        const top_k = args.top_k ?? 3

        const { exec } = await import("child_process")
        const util = await import("util")
        const execPromise = util.promisify(exec)

        const python = process.env.EXPERIGEN_SYSTEM_PYTHON || "python3"
        const command = `PYTHONPATH=${experigenRoot} ${python} ${script} --csv_path "${csv_path}" --query "${args.query}" --top_k ${top_k}`

        try {
            const { stdout } = await execPromise(command, { timeout: 30000 })
            return stdout.trim()
        } catch (error) {
            return JSON.stringify({ error: String(error) })
        }
    },
})