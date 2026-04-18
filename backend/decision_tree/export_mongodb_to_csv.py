from pymongo import MongoClient
import pandas as pd
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client['SphereSleep']
collection = db['sensor_data']

# Fetch all data
data = list(collection.find({}))

# Convert to DataFrame
df = pd.DataFrame(data)

# Convert _id to string
df['_id'] = df['_id'].astype(str)

# Save to CSV
df.to_csv('SphereSleep.sensor_data.csv', index=False)

print(f"Exported {len(df)} records to SphereSleep.sensor_data.csv")