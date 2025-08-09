from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
import random

load_dotenv()

def get_distractions(task):
    ins = """You are an distracting ai which provides some distracting activities like watching youtube or scolling instagram, also recommend new series and cinemas(include names of the shows and movies) and also recommend some youtube channels in json format no any other output other than the distracting activities always dont categorize the distrsactions and make the distractions in one big list in pure json in format [distraction,......,distraction] dont include anything other than json even the ```json ``` thing"""
    client = genai.Client(api_key=os.getenv('API_KEY'))

    response = client.models.generate_content(
        model="gemini-2.5-flash", contents=f"Gimme 2 distracting activities for distracting from this task  '{task}'", config=types.GenerateContentConfig(system_instruction=ins)
    )
    print(response.text)
    return eval(response.text)


if __name__ == '__main__':
    ai()