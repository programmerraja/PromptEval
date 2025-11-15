Prompt page & eval page

We need to resuse the same code that on eval page single turn tab on both eval page and prompts eval tab page because both are same so let use it on both pages.

- on eval tab we asking user for eval prompt instead of that show all eval prompt and allow them to choose one from it.
- Also currently we mapping all datset and allow user to check the dataset but this UI will not scalble if we have lot of dataset so come up with idea that UI will nice even if we have more dataset.


I have redesing the evals 

removed some keys and we need to redesign like below

for single turn and multi turn
    - user just need to give single filed prompt where user need to enter the text 
     so i removed the input field and added the prompt field

also currently in prompt page we have feature add to dataset where for multi turn we have auto extract and manual entry on on auto extract we have strutured extraction let change it now it will only reutrn a single stirng after extraction show that to user and let them to edit if they want and add to dataset 