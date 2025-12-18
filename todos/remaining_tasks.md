# Project Status and Remaining Tasks

## Prompt Page
- [ ] On creating prompt, ask the user if it is a single chat or multichat prompt (Currently defaults to single-turn).
- [ ] Allow user to edit prompt in playground (Currently read-only).
- [x] Variable Substitution on playground: Remove preview (Preview section is commented out/removed).
- [ ] Variable Substitution: Disable deleting variables (Delete button still exists).

## Playground Page
- [ ] Allow user to add to specific dataset from Playground Chat (Currently auto-saves to "Playground Conversations").
- [ ] For single turn: Allow selecting one response and adding it to a dataset.
- [ ] For multi turn: Implement extraction of dataset from conversation using an editable prompt.

## Eval Tab / Page
- [x] Introduce new Eval tab.
- [ ] Single chat with placeholders: Allow user to map dataset columns to placeholders.
- [ ] Implement Multi-chat evaluation page (Currently shows "not yet implemented").
- [x] Allow user to add different Eval prompts.
- [x] Config the models.
- [x] Run Single Prompt evaluation loop.
- [ ] Run MultiPrompt evaluation (Simulation + Eval).

## Dataset Page
- [ ] For single turn: Remove "Expected Behavior" field (Still present in Dialog and View).

## Database
- [ ] Update `db.ts` to support new schemas required for the above changes (e.g., placeholder mappings, multi-chat eval configurations).
