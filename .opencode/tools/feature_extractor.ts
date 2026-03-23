import { tool } from "@opencode-ai/plugin"
import path from "path"

export default tool({
    description: "Given a natural language feature description (e.g., sentiment, number of form fields, image emotion), this tool uses a language or vision-language model to annotate each input item (e.g., tweet, image) with one of the specified types. The tool (1) updates the CSV with a new column containing the inferred feature values and (2) returns a summary of the feature's distribution against the target column. The agent must specify: the feature name, possible feature values, and a natural language description of the feature used for prompting the LLM. IMPORTANT: If a feature with the same name already exists in the dataset (check the 'Previously Extracted Features' list in your prompt), the tool will automatically return the existing distribution WITHOUT re-running the LLM — saving time and cost. You should still pass the same feature name if you want to reuse an existing feature; the tool handles deduplication automatically.",
    args: {
        data_column: tool.schema.string().describe("Name of the text column to analyze (e.g., 'review_sentence')"),
        target_column: tool.schema.string().describe("Name of the target/label column (e.g., 'label')"),
        feature: tool.schema.string().describe("Short column name for the feature to extract (e.g., 'sentiment', 'tone'). This will be used as a column in the output CSV."),
        types: tool.schema.array(tool.schema.string()).describe("A list of values the feature can take. Ensure full coverage, use few values to avoid sparsity."),
        description: tool.schema.string().describe("A natural language prompt that explains how to interpret the feature. This guides the LLM in assigning feature values from the provided types.")
    },
    async execute(args, context) {
        const typesJson = JSON.stringify(args.types)
        const experigenRoot = "/dev/shm/somesh/experigen"
        const script = path.join(experigenRoot, "experigen/algorithm/tools/feature_extractor_cli.py")
        const csv_path = process.env.EXPERIGEN_CSV_PATH
        // Using Node.js child_process.exec since Bun is not available
        const { exec } = await import("child_process")
        const util = await import("util")
        const execPromise = util.promisify(exec)

        const python = process.env.EXPERIGEN_SYSTEM_PYTHON || "python3"
        const command = `PYTHONPATH=${experigenRoot} ${python} ${script} --csv_path "${csv_path}" --data_column "${args.data_column}" --target_column "${args.target_column}" --feature "${args.feature}" --types '${typesJson}' --description "${args.description}"`

        try {
            const { stdout } = await execPromise(command)
            return stdout.trim()
        } catch (error) {
            return JSON.stringify({ error: String(error) })
        }
    },
})
