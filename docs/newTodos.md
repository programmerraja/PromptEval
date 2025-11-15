


Prompt
- move the editor level model config to seprate tab 
- presist the playground chats on db level it should be seprate playgrounds table need to refer the prompt id and version id
- when i edit prompt in playground it not saved and when i add varaiables it not refelecting we need to fix that
- on eval tab allow user to select multi dataset and run and see the live result (remove the provider option that currently showing)
    - also have default eval prompt  show the live eval result in same eval tab below
- ON eval result tab it need to show the previous evals

Eval page
- on EvaluationPrompt i have newly added schema filed what it was where user need to define how the JSON output for eval should be user can give any key and value we need to send that with eval prompt and response will be that schema type json
- Same allow user to select mutlidatset and run
- replace Model Configuration tab with our common model configuration tab



Refactor
- Create folder for each page and create components inside each folder to keep the components that only needed for that page

- we need a commont utill function to get call LLM with default provider settings (create a custom hook for this)
- we need proper  types current system

- - Also we need to allow user to map the dataset with prompt placeholder



ON dataset page
- when user clicks add dataset entry for multi turn we need to show tab for extract data from conversation where user can give the conversation and extraction prompt default show global allow user to edit and then click extract combine the conversation and extraction prompt send to LLM show the result to user allow them to edit etc and then allow user to add to dataset.


on Mutichat simulator page
- when user clicks start conversation and the conversation is completed. we can have two options eval this conversation or export the conversation as dataset entry.
- on eval we need to send the conversation to eval prompt and get the eval result show to the user
- on export we need to export the conversation as dataset entry.