## Set up (fastapi backend)

1. Go to backend folder 
2. Create the virtual environment
```bash
   #Python version - Python 3.12.3
   python -m venv venv
```
3. Select the python interpreter
```txt
shift + ctrl + P --> python: select interpreter --> Enter interpreter path... --> find --> choose your created venv//script//python.exe file
```
4. Activate the venv
```bash
   #windows
   venv\Scripts\activate

   #Mac/Linux
   source venv/bin/activate
```
5. Install required packages
```bash
    pip install -r requirements.txt
```
6. Folder structure
```bash
backend/
├── main.py              # FastAPI app, lifespan, REST endpoints
├── mqtt_subscriber.py   # MQTT client, runs in background via lifespan
├── database.py          # Motor (async MongoDB) client — shared by both
├── models.py            # Pydantic models for readings + MongoDB docs
├── routers/
│   └── readings.py      # GET /readings, GET /latest, GET /readings/{id}
├── requirements.txt
└── .env
```
7. Inside .env file
```txt
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/sleepsense?retryWrites=true&w=majority
MQTT_URL=your-hivemq-host
MQTT_USER=your-username
MQTT_PASS=your-password
```
8. To run the backend use
```bash
   uvicorn main:app --reload
```