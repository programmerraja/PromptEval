Prompt page
 - on creating prompt we need to ask the user does it was single chat or multichat prompt
 - allow user to edit prompt in playground
 - currently we have Variable Substitution on playground (where we have preview we can remove that ) 
    - currtently we are allowing user to delte the varaible we dont want that if they want to delete let them remove on prompt

 - playground page
    - on Playground Chat allow user to add to dataset 
        - for single turn they can just select one response and add to dataset
        - For multi turn we need to get all conversation and we need to have a prompt to extract the dataset from conversation (allow user to edit that prompt also we need way to edit the prompt)
 

 - introduce new Eval tab where user can choose the eval prompt and Dataset and run the evaluation and show the result
    - if it single chat and contain palceholder then we need to allow user to map the single prompt dataset with placeholder (should also handle if it has multiple placeholders)
    - if it is multi chat then we need to page same as multi chat 


 Dataset page 
  - For single turn remove expected behavior 


  Eval page
- Allow user to add different Eval prompts 
- Config the  models 
- To run 
    single prompt
    - choose the prompt + dataset  => send to LLM and get the answer use the EVAL prompt and again send to LLM with llm answer and get the EVAL result show to the customer
   MultiPrompt
    - choose the prompt and dataset and run the simulation allow user to view the conversation stop/pause etc after compeleteion send the conversation to EVAL prompt and get the EVAL result show to the customer

NOTES: for these changes we also need to update our db.ts