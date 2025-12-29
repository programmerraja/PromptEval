Eval page

- currently we showing all datasets as block we need dropdown with multiselct such that it will scale if we have more dataset.
- let remove Use different evaluator model on eval tab and correspoding state, function that used for that
- move model config seprate tab to below last on eval tab
- move renderResult tab to seprate component
- we need to show result per eval because the the eval struct different which easy for us to view for user have filter to choose the eval prompt or come up with better apporach
- also aggregation return like below

{
"totalRuns": 2,
"metrics": {
"is_correct": {
"type": "boolean",
"count": 2,
"distribution": {
"true": 2,
"false": 0
}
},
"confidence": {
"type": "number",
"count": 2,
"stats": {
"avg": 3,
"min": 1,
"max": 5,
"median": 5,
"p90": 5
},
"distribution": {
"1": 1,
"5": 1
}
},
"notes": {
"type": "string",
"count": 2,
"distribution": {
"The assistant was polite, addressed the order cont...": 1,
"The assistant was extremely polite, used empathy, ...": 1
}
},
"reasoning": {
"type": "string",
"count": 2,
"distribution": {
"The assistant was polite and empathetic, using app...": 1,
"The assistant was highly polite and apologetic ('I...": 1
}
}
}
}

But we not rendering it on ui we only show few metrics on card headers let create seprate component for that and show it

Prompt page

- when we updated the model config we just updating in state level on our db when we refresh it reset to old so fix that

We need to allow user to swap provider easily in all pages and give prompt and test with multiple providers at a same time parallely
