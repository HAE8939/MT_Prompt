# Prompt Engine

## Inputs

The generator sends a model task, template, Chinese field values, and selected Skill IDs. The API also loads all enabled personal rules that apply globally or to the selected task.

Before compilation, selected Skills must be enabled and compatible with the task. Incompatible or missing selections fail instead of being silently ignored.

## Translation

Chinese field values are sent to the configured provider before bilingual compilation. Supported providers are OpenAI and Microsoft Translator. Their credentials are resolved from Windows Credential Manager.

Translation failure does not discard the Chinese result. The persisted run records `FAILED`, provider identity, and an error message; the generator exposes a retry action. A successful retry fills the English result and changes the status to `SUCCEEDED`.

## Deterministic Compilation

`packages/compiler` is a pure function. It:

1. Rejects multiple selected Skills in the same conflict group.
2. Replaces `{{field}}` placeholders with the matching Chinese or English value.
3. Maps personal rules, Skills, and the filled template into named sections.
4. Orders sections using `ModelTask.sectionOrder`, then orders contributions by descending priority.
5. Removes exact duplicate bilingual contributions.
6. Joins contributions with a blank line and returns metadata about the selected knowledge.

The same inputs and knowledge versions produce the same output. Provider translation is outside the pure compiler boundary.

## Provenance

Every `CompilationRun` stores:

- model task and template stable keys;
- template version;
- original Chinese input values;
- applied personal-rule snapshot;
- selected Skill stable keys, versions, and content snapshots;
- Chinese/English output and translation status;
- compiler version and creation time.

When saved to the library, the Prompt links back to this run. The detail panel surfaces template, compiler, translation provider, and Skill versions so generated content remains explainable after knowledge changes.

## Editing Generated Prompts

After generation, the saved Prompt behaves like a normal library record. Editing updates the current fields and creates a new `PromptVersion`; it does not rewrite the original `CompilationRun` provenance.
