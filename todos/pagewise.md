
Prompt 
 - on model config we passing hardcoded provider  and we are not updating on prompt level and in our db also we have same code for onMaxTokensChange,onTopPChange etc write a single function update key and value and requreid thing  update the state
 - on playground we have hardcoded provider some place use from prompt level 
  - on playground component we have getAIClient move to util or where it will be and use it also if it present on other page make it common on one place and use it 


Dataset
- we have a huge component let split it into multiple components split left nav and the list of data entries to sepreate component on same file dont create new file
 - when user click add entry on multi turn we asking title and we have two tab extraction conversation and manual entry we need to change that to title and ask the user for extractedPrompt where user can paste there promp and below conversation where user can paste there conversation we need to parse it as json and store we dont manual entry tab also ai calling feature to extract the data 


Evalution
- we have mutliple state for model config like setModel,setTemperature,setMaxTokens,setTop convert to single state modelconfig and use it 
- we have hardcoded  const apiKey = settings?.api_keys?.google; we dont want we have on  setting page  defaule eval model let use it or in ui allow user to choose different currently we have it only show model not provider we need to handle 
- we need filter on eval results page by prompt, aggregate result like score > 2 etc ccome up with good ux apporach
