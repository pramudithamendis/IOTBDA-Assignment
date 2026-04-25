#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <BH1750.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "ml_model.h"

StaticJsonDocument<512> doc;
// ─────────────────────────────────────────────
// MQTT
// ─────────────────────────────────────────────
// Wi-Fi credientials
const char* ssid = "Chanmi's Galaxy A03";
const char* password = "bmaq0949";

// HiveMQ Cloud MQTT setting
const char* mqtt_server = "64cb4b0335ed4af8ba9b273a97acea91.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "User4_2026_G29";
const char* mqtt_pass = "A$hm!@2104";
const char* topic = "sleepsense/user_001/sensors";
const char* ml_topic = "sleepsense/user_001/ml";


// ─────────────────────────────────────────────
// PIN DEFINITIONS
// ─────────────────────────────────────────────

// Sound Sensor (KY-037)
#define SOUND_PIN        32
#define SOUND_THRESHOLD  25
#define MIN_DURATION     50
const int NUM_READINGS = 5;

// Ultrasonic Sensor (HC-SR04)
#define TRIG_PIN  12
#define ECHO_PIN  13

// PIR Motion Sensor
#define PIR_PIN   19

// Light Sensor (BH1750)
#define SDA_PIN   21
#define SCL_PIN   22

// Temperature & Humidity (DHT22)
#define DHTPIN    4
#define DHTTYPE   DHT22

// ─────────────────────────────────────────────
// VALIDATION CONSTANTS
// ─────────────────────────────────────────────
#define TEMP_MIN          10.0
#define TEMP_MAX          45.0
#define HUMID_MIN          0.0
#define HUMID_MAX        100.0

// ─────────────────────────────────────────────
// ROLLING WINDOW
// ─────────────────────────────────────────────
#define WINDOW_SIZE 1200
#define SAMPLE_INTERVAL_MS 500
#define ML_INTERVAL_MS 60000 

float soundWindow[WINDOW_SIZE]    = {0};
float motionWindow[WINDOW_SIZE]   = {0};
float lightWindow[WINDOW_SIZE]    = {0};
float tempWindow[WINDOW_SIZE]     = {0};
float humidityWindow[WINDOW_SIZE] = {0};

int wIndex = 0;
bool windowReady = false;

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
unsigned long lastMLTime = 0;

// ─────────────────────────────────────────────
// SENSOR STATE VARIABLES
// ─────────────────────────────────────────────

// Sound
int     readings[NUM_READINGS] = {0};
int     indexReading            = 0;
bool    noiseDetected           = false;
unsigned long noiseStart        = 0;

// Ultrasonic
long          prevDistance = 0;
unsigned long lastUltra    = 0;

// PIR
int           prevMotion = 0;
unsigned long lastPIR    = 0;

// ─────────────────────────────────────────────
// OBJECTS
// ─────────────────────────────────────────────
BH1750       lightMeter;
DHT          dht(DHTPIN, DHTTYPE);
WiFiClientSecure espClient;
PubSubClient client(espClient);

// ─────────────────────────────────────────────
// HELPER: Median filter (DHT22 noise reduction)
// ─────────────────────────────────────────────
float medianOf3(float a, float b, float c) {
  if ((a <= b && b <= c) || (c <= b && b <= a)) return b;
  if ((b <= a && a <= c) || (c <= a && a <= b)) return a;
  return c;
}

// ─────────────────────────────────────────────
// HELPER: Get ultrasonic distance (cm)
// ─────────────────────────────────────────────
long getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // Reads the echoPin, returns the sound wave travel time in microseconds
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  // Calculating the distance (Speed of sound is ~340m/s)
  return duration * 0.034 / 2;
}

// ─────────────────────────────────────────────
// HELPER: Validate DHT22 reading
// ─────────────────────────────────────────────
bool isValidReading(float temp, float humid) {
  if (isnan(temp) || isnan(humid)) {
    Serial.println("Rejected: NaN reading");
    return false;
  }
  if (temp < TEMP_MIN || temp > TEMP_MAX) {
    Serial.printf("Rejected: Temp %.1f out of range [%.0f-%.0f]\n",
                  temp, TEMP_MIN, TEMP_MAX);
    return false;
  }
  if (humid < HUMID_MIN || humid > HUMID_MAX) {
    Serial.printf("Rejected: Humidity %.1f out of range\n", humid);
    return false;
  }
  return true;
}


// ─────────────────────────────────────────────
// FEATURE ENGINEERING (10 features for TinyML)
// ─────────────────────────────────────────────
void buildFeatures(float f[10]) {

  // ---------------- PASS 1: MEAN ----------------
  float acd_sum = 0;
  float motion_sum = 0;
  float light_sum = 0;
  float temp_sum = 0;
  float humid_sum = 0;

  float acd_max = soundWindow[0];

  for (int i = 0; i < WINDOW_SIZE; i++) {

    float s = soundWindow[i];

    acd_sum += s;
    motion_sum += motionWindow[i];
    light_sum += lightWindow[i];
    temp_sum += tempWindow[i];
    humid_sum += humidityWindow[i];

    if (s > acd_max) acd_max = s;
  }

  float acd_mean = acd_sum / WINDOW_SIZE;
  float motion_mean = motion_sum / WINDOW_SIZE;
  float light_mean = light_sum / WINDOW_SIZE;
  float temp_mean = temp_sum / WINDOW_SIZE;
  float humid_mean = humid_sum / WINDOW_SIZE;

  // ---------------- PASS 2: STD ----------------
  float sound_var = 0;
  float temp_var = 0;
  float humid_var = 0;
  float light_var = 0;

  for (int i = 0; i < WINDOW_SIZE; i++) {

    sound_var += pow(soundWindow[i] - acd_mean, 2);
    temp_var  += pow(tempWindow[i] - temp_mean, 2);
    humid_var += pow(humidityWindow[i] - humid_mean, 2);
    light_var += pow(lightWindow[i] - light_mean, 2);
  }

  float sound_std = sqrt(sound_var / WINDOW_SIZE);
  float temp_std  = sqrt(temp_var / WINDOW_SIZE);
  float humid_std = sqrt(humid_var / WINDOW_SIZE);
  float light_std = sqrt(light_var / WINDOW_SIZE);

  // ---------------- PASS 3: FEATURES ----------------
  int spikes = 0;
  int light_duration = 0;

  for (int i = 0; i < WINDOW_SIZE; i++) {

    // spike definition (same as Python)
    if (soundWindow[i] > acd_mean + sound_std) {
      spikes++;
    }

    // light exposure duration
    if (lightWindow[i] > 20.0f) {
      light_duration++;
    }
  }

  // ---------------- OUTPUT ----------------
  f[0] = acd_mean;
  f[1] = acd_max;
  f[2] = sound_std;
  f[3] = spikes;
  f[4] = motion_mean;
  f[5] = light_mean;
  f[6] = light_std;
  f[7] = light_duration;
  f[8] = temp_std;
  f[9] = humid_std;
}

// ─────────────────────────────────────────────
// MQTT RECONNECT
// ─────────────────────────────────────────────
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    if (client.connect("ESP32_Sleep_Monitor", mqtt_user, mqtt_pass)) {
      Serial.println("Connected to HiveMQ Cloud");
    } else {
      Serial.print("Failed rc=");
      Serial.print(client.state());
      Serial.println(" — retry in 5s");
      delay(5000);
    }
  }
}

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  pinMode(SOUND_PIN, INPUT);
  pinMode(TRIG_PIN,  OUTPUT);
  pinMode(ECHO_PIN,  INPUT);
  pinMode(PIR_PIN,   INPUT);

  Wire.begin(SDA_PIN, SCL_PIN);
  lightMeter.begin();
  dht.begin();

  // Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // NTP time sync (Sri Lanka UTC+5:30 = 19800s offset)
  configTime(19800, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing time");
  while (time(nullptr) < 1000000000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nTime synced");

  // MQTT
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
}

// ─────────────────────────────────────────────
// LOOP
// ─────────────────────────────────────────────
void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  float sound = analogRead(SOUND_PIN);
  float motion = digitalRead(PIR_PIN);
  float lux = lightMeter.readLightLevel();

  float tempSensor  = dht.readTemperature();
  float humSensor   = dht.readHumidity();

  if (!isValidReading(tempSensor, humSensor)) return;

  // update windows
  soundWindow[wIndex] = sound;
  motionWindow[wIndex] = motion;
  lightWindow[wIndex] = lux;
  tempWindow[wIndex] = tempSensor;
  humidityWindow[wIndex] = humSensor;

  wIndex = (wIndex + 1) % WINDOW_SIZE;

  static int fillCount = 0;

  if (!windowReady) {
    fillCount++;

    if (fillCount >= WINDOW_SIZE) {
      windowReady = true;
      Serial.println("[WINDOW] READY");
    }
  }

  unsigned long now = millis();

  // ---- Build timestamp ----
  time_t nowTime = time(nullptr);
  char timeStr[25];
  strftime(timeStr, sizeof(timeStr), "%Y-%m-%dT%H:%M:%SZ", gmtime(&nowTime));

  // ---- Session ID ----
  char sessionId[40];
  struct tm* tmInfo = gmtime(&nowTime);
  snprintf(sessionId, sizeof(sessionId),
          "sleep_%04d%02d%02d_user001",
          tmInfo->tm_year + 1900,
          tmInfo->tm_mon + 1,
          tmInfo->tm_mday);

  // ---- 1. Sound Sensor (moving average + noise duration) ----
  readings[indexReading] = analogRead(SOUND_PIN);
  indexReading = (indexReading + 1) % NUM_READINGS;

  int sum = 0;
  for (int i = 0; i < NUM_READINGS; i++) sum += readings[i];
  int avgSound = sum / NUM_READINGS;

  if (avgSound > SOUND_THRESHOLD) {
    if (!noiseDetected) {
        noiseStart = now;
        noiseDetected = true;
    }
  }
  else {
      noiseDetected = false;
  }

  // ---- 2. Ultrasonic Sensor (filter spikes every 2s) ----
  long distance = prevDistance;

  if (now - lastUltra >= 2000) {
    lastUltra = now;

    long rawDistance = getDistance();

    if (rawDistance >= 2 && rawDistance <= 400) {
      distance = rawDistance;
      prevDistance = rawDistance;
    }
}

  // ---- 3. PIR Sensor (check every 500ms) ----
  int motionStatus = prevMotion;
  if (now - lastPIR >= 500) {
    lastPIR = now;
    motionStatus = digitalRead(PIR_PIN);
    prevMotion = motionStatus;
  }

  // ---- 4. Light Sensor (BH1750) ----
  if (lux < 0) lux = 0;

  //---- 5. Temperature & Humidity (DHT22) with median filter ----
  float t1 = dht.readTemperature(); delay(200);
  float t2 = dht.readTemperature(); delay(200);
  float t3 = dht.readTemperature();
  float h1 = dht.readHumidity(); delay(200);
  float h2 = dht.readHumidity(); delay(200);
  float h3 = dht.readHumidity();
  float temp = medianOf3(t1, t2, t3);
  float humid = medianOf3(h1, h2, h3);

  if (!isValidReading(temp, humid)) {
    Serial.println("Reading skipped — not published.");
    return;
  }

  // ---- 6. Build JSON payload for MQTT ----
  String payload = "{";
  payload += "\"timestamp\":\"" + String(timeStr) + "\",";
  payload += "\"session_id\":\"" + String(sessionId) + "\",";
  payload += "\"user_id\":\"user_001\",";
  payload += "\"sound_level\":" + String(avgSound) + ",";
  payload += "\"distance\":" + String(distance) + ",";
  payload += "\"motion_detected\":" + String(motionStatus) + ",";
  payload += "\"light_intensity\":" + String(lux) + ",";
  payload += "\"temperature\":" + String(tempSensor) + ",";
  payload += "\"humidity\":" + String(humSensor);
  payload += "}";

  client.publish(topic, payload.c_str());
  Serial.println(payload);

  if (windowReady && (millis() - lastMLTime >= ML_INTERVAL_MS)) {

      lastMLTime = millis();

      float features[10];
      buildFeatures(features);
      float score = predict(features);

      String mlPayload = "{";
      mlPayload += "\"type\":\"ml\",";
      mlPayload += "\"timestamp\":\"" + String(timeStr) + "\",";
      mlPayload += "\"session_id\":\"" + String(sessionId) + "\",";
      mlPayload += "\"sleep_score\":" + String(score) + ",";

      mlPayload += "\"features\":[";
      for (int i = 0; i < 10; i++) {
          mlPayload += String(features[i]);
          if (i < 9) mlPayload += ",";
      }
      mlPayload += "]}";

      client.publish(ml_topic, mlPayload.c_str());
      Serial.println(mlPayload);
  }

  delay(500); // uniform interval for all sensors
}