import os
import google.generativeai as genai
from dotenv import load_dotenv


load_dotenv()


genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def build_prompt(message, context):
    """
    Constructs the system and user instructions for the Gemini model.
    """
    system_instruction = (
        "You are a sleep analytics assistant. "
        "Explain trends using time-series sleep scores, anomalies, and sensor data. "
        "Be precise and do not hallucinate. Use bullet points for readability."
    )

    user_prompt = f"""
    {system_instruction}

    User Question: {message}

    Context Data:
    - Start Score: {context.get('start_score', 'N/A')}
    - End Score: {context.get('end_score', 'N/A')}
    - Trend: {context.get('trend', 'Unknown')}
    - Drop: {context.get('drop', 0)}
    - Avg Score: {context.get('avg_score', 'N/A')}
    - Lowest Score: {context.get('lowest_score', 'N/A')}
    - Anomaly Count: {context.get('anomaly_count', 0)}
    - Recent Anomalies: {context.get('recent_anomalies', 'None reported')}
    - Avg Temp: {context.get('avg_temp', 'N/A')}
    - Avg Motion: {context.get('avg_motion', 'N/A')}

    Explain what happened based on the data.
    """
    return user_prompt

def call_gemini(prompt):
    """
    Calls the Gemini model.
    """
    try:
    
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Error calling Gemini: {str(e)}"
