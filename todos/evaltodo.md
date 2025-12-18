# Generic Prompt Evaluation System – Detailed Specification

## 1. Purpose & Scope

This document specifies the design of a **generic, scalable prompt evaluation system** that supports:

* Single-turn and multi-turn prompts
* Arbitrary datasets (10 → 1000+ rows)
* User-defined evaluation logic

The goal is **human-understandable evaluation at scale**, not just metric computation.

## 2. Core Design Principles (Invariants)

These principles must never be violated:

1. **Evaluation outputs are data, not logic**
2. **UI must not know eval semantics** (only data types)
3. **Aggregation is a first-class concept**
4. **Raw evals are never hidden**
5. **Single-turn and multi-turn are input variations, not system modes**

## 3. Mental Model

```
Dataset → Prompt Runner → Model Output
                              ↓
                        Eval Engine
                              ↓
                    Eval Records (Raw)
                              ↓
                    Aggregation Engine
                              ↓
                    UI (Overview → Drill-down)
```

Key separation:

* Eval Engine judges **one test case**
* Aggregation Engine summarizes **many judgments**


## 4. Entities & Responsibilities

### 4.1 Dataset

Represents expected or reference behavior.

**Single-turn dataset row**:

```json
 {
        "id": "dataset_1761057730237",
        "name": "SINGLE",
        "type": "single-turn",
        "description": "To test how it answer basic question",
        "created_at": "2025-10-21T14:42:10.237Z",
        "entries": [
          {
            "type": "single-turn",
            "title": "Hello",
            "expected_behavior": "I am find ",
            "input": "how are you?",
            "id": "entry_1765951861680",
            "created_at": "2025-12-17T06:11:01.680Z"
          }
        ]
      },
```

**Multi-turn dataset row**:

```json
    {
    "id": "dataset_1761057531841",
    "name": "Playground Conversations",
    "type": "multi-turn",
    "description": "Conversations exported from the playground",
    "created_at": "2025-10-21T14:38:51.841Z",
    "entries": [
      {
        "id": "entry_1761060159722",
        "type": "multi-turn",
        "title": "Playground Conversation - 21/10/2025, 20:52:39",
        "conversation": [
          {
            "role": "user",
            "content": "hi i have  Business Inquiries"
          },
          {
            "role": "assistant",
            "content": "Hello there! I'll help you with your business inquiry. To start, could you please tell me what company you are representing today?"
          },
          {
            "role": "user",
            "content": "google"
          },
          {
            "role": "assistant",
            "content": "Thank you. And what products or services are you inquiring about today?"
          },
          {
            "role": "user",
            "content": "i am looking for  PHYSICIAN REFERRAL"
          },
          {
            "role": "user",
            "content": "i am looking for  PHYSICIAN REFERRAL"
          },
          {
            "role": "assistant",
            "content": "Thank you for clarifying. So, you're calling from Google regarding a physician referral. I'll help you with your referral inquiry.\n\nAre you sending a new referral or following up on an existing one?"
          },
          {
            "role": "user",
            "content": "exiting one"
          },
          {
            "role": "assistant",
            "content": "Okay, you're following up on an existing referral. What's the patient's name you're referring to?"
          },
          {
            "role": "user",
            "content": "jhon"
          },
          {
            "role": "assistant",
            "content": "Thank you, John. And what's the primary concern for John – is it mental health, substance abuse, or both?"
          },
          {
            "role": "user",
            "content": "both"
          },
          {
            "role": "assistant",
            "content": "Thank you. Is this referral urgent, crisis-level, or routine priority?"
          },
          {
            "role": "user",
            "content": "urgent"
          },
          {
            "role": "assistant",
            "content": "Understood, this is an urgent referral.\n\nWhat level of care are you considering for John – outpatient, inpatient, crisis stabilization, or detox?"
          }
        ],
        "created_at": "2025-10-21T15:22:39.722Z",
         "extractedPrompt":"You are simulating a caller with a business inquiry related to a physician referral.\\n\\nRole and behavior:\\n\\nYou are calling on behalf of Google\\n\\nYou respond briefly and minimally to each question\\n\\nYou do not volunteer extra information unless asked\\n\\nYou may repeat answers if the assistant asks again\\n\\nYour tone is neutral and cooperative\\n\\nScenario details (do not reveal unless prompted):\\n\\nThe inquiry is about physician referral\\n\\nIt is an existing referral, not a new one\\n\\nPatient name: John\\n\\nPrimary concern: both mental health and substance abuse\\n\\nPriority level: urgent\\n\\nInteraction rules:\\n\\nAnswer only what is asked\\n\\nUse short, lowercase, informal replies where appropriate\\n\\nDo not correct the assistant unless necessary\\n\\nDo not add medical explanations\\n\\nGoal:\\n\\nProceed through a realistic physician-referral follow-up call\\n\\nAllow the assistant to control the flow of questions"
      }
    ],
   
  }
```

The system treats both as **opaque input context**.


we need to run simulation for both single turn and multi turn for single turn one llm call is fine but for multi turn we need to run llm for each turn

for multi turn we have 2 llm for one llm user system prompt is used and for another llm we use extractedPrompt from dataset and simulate the conversation

also we need to stop simulation if any llm said end for that also we need to include in our prompt we need to handle else both will talk for ever


Now once we done simulation for both single turn and multi turn we need to run eval for each row

---

### 4.2 Prompt Definition

Defines how the model should behave.

```json
{
  "prompt_id": "p1",
  "type": "single_turn | multi_turn",
  "prompt_text": "..."
}
```

Prompt type affects **execution**, not evaluation.

---

### 4.3 Eval Definition (Eval Contract)

on eval tab we have eval prompt mangagement 
Defines how an evaluation works.

```json
{
    "id": "eval_prompt_1761055494298",
    "name": "Basic",
    "prompt": "Judge relevance...",
    "schema": {
        "relevance_score": "number",
        "is_relevant": "boolean",
        "reasoning": "string"
    },
    "created_at": "2025-10-21T14:04:54.298Z"
}
```

current the UI for schema enter is input text but we need to change that where user need to give type of schema form dropdown number,boolena,string
**Critical rule**: every eval must declare its output schema.

---

## 5. Eval Execution

For each dataset row:

1. Run prompt → get model output
2. Construct eval input:

   * model output
   * dataset context
   * conversation if multi-turn
3. Run eval prompt
4. Validate output against schema
5. Persist as **Eval Record**

---

## 6. Eval Record (Raw Data)

```json
{
  "run_id": "run_123",
  "row_id": "row_1",
  "eval_id": "relevance_eval",
  "output": {
    "relevance_score": 4,
    "is_relevant": true,
    "reasoning": "Answer addresses core intent"
  }
}
```

Eval Records are immutable and auditable.

---

## 7. Aggregation Engine

### 7.1 Purpose

Transforms **many eval records** into **human-readable summaries**.

Aggregation never re-runs evals.

---

### 7.2 Aggregation Rules by Data Type

| Data Type | Allowed Aggregations                             |
| --------- | ------------------------------------------------ |
| number    | avg, min, max, median, percentiles, distribution |
| boolean   | true %, false %, failure rate                    |
| enum      | frequency count                                  |
| list      | flattened frequency                              |
| string    | sampling, clustering, exemplars only             |

Text fields are **never averaged**.

---

### 7.3 Aggregation Output Example

```json
{
  "eval_id": "relevance_eval",
  "metrics": {
    "relevance_score": {
      "avg": 3.8,
      "p90": 4.5,
      "distribution": {"1": 2, "2": 5, "3": 20, "4": 50, "5": 23}
    },
    "is_relevant": {
      "true_percent": 92
    }
  }
}
```

---

## 8. UI Architecture (Four Mandatory Layers)

### 8.1 Layer 1 – Overview

Purpose: Answer **“Is this prompt good overall?”**

* Aggregated metrics only
* One screen
* No raw text

---

### 8.2 Layer 2 – Distribution

Purpose: Answer **“Is behavior consistent?”**

* Histograms
* Failure rates
* Metric variance

---

### 8.3 Layer 3 – Outliers

Purpose: Answer **“Where does it fail?”**

* Lowest scoring rows
* All failed boolean cases
* Rare enum values

---

### 8.4 Layer 4 – Raw Detail

Purpose: Answer **“Why did this case fail?”**

* Full prompt
* Model output
* Eval reasoning

---

## 9. Scalability Considerations

* Aggregations computed server-side
* Pagination at raw record level
* Caching per (prompt, dataset, eval)
* No UI rendering of >20 raw rows at once

---

## 10. Extensibility Guarantees

The system supports new evals without code changes if:

* Output schema is declared
* Data types are supported

Examples supported automatically:

* Safety policy violations
* Reasoning quality
* Cost & latency evals
* Multi-judge consensus

---

## 11. Anti-Patterns (Explicitly Forbidden)

* Single final score only
* Hardcoded eval types in UI
* Averaging text
* Mixing eval logic with aggregation
* Special-casing multi-turn

---

## 12. Conceptual Validation Question

If an eval outputs:

```json
{
  "confidence": 0.7,
  "violations": ["policy_1", "policy_3"],
  "commentary": "Mostly correct but risky"
}
```

