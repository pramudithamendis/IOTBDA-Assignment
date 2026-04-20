#include <Chirale_TensorFlowLite.h>
#include "model.h"

#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"

#include "DHT.h"

// ===================== MODEL SETTINGS =====================
constexpr int kTensorArenaSize = 30 * 1024;
uint8_t tensor_arena[kTensorArenaSize];

tflite::MicroInterpreter* interpreter;
TfLiteTensor* input;
TfLiteTensor* output;

// ===================== PINS =====================
const int LED_PIN = 15;

// Ultrasonic sensor
const int trigPin = 13;
const int echoPin = 12;

// Light & Sound ADC pins
const int LIGHT_PIN = 34;
const int SOUND_PIN = 32;

// DHT sensor
#define DHTPIN 4
#define DHTTYPE DHT11   // change to DHT22 if needed
DHT dht(DHTPIN, DHTTYPE);

// ===================== NORMALIZATION VALUES =====================
// ⚠️ REPLACE THESE with your scaler_min / scaler_max from Python
const float min_vals[4] = {0, 0, 0, 0};
const float max_vals[4] = {4095, 100, 100, 200}; 
// order: light, temp, humidity, sound (adjust after checking real ranges)

// ===================== NORMALIZE FUNCTION =====================
float normalize(float x, float min_v, float max_v) {
  return (x - min_v) / (max_v - min_v);
}

// ===================== SENSOR FUNCTIONS =====================

// Ultrasonic distance (optional use or replace humidity if needed)
float getDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.034 / 2.0;
}

// Light sensor
float getLight() {
  return analogRead(LIGHT_PIN);
}

// Sound sensor
float getSound() {
  return analogRead(SOUND_PIN);
}

// Temperature
float getTemperature() {
  float t = dht.readTemperature();
  if (isnan(t)) return 0;
  return t;
}

// Humidity
float getHumidity() {
  float h = dht.readHumidity();
  if (isnan(h)) return 0;
  return h;
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  dht.begin();

  // Load model
  const tflite::Model* model = tflite::GetModel(model_tflite);

  static tflite::MicroMutableOpResolver<4> resolver;
  resolver.AddFullyConnected();
  resolver.AddRelu();
  resolver.AddSoftmax();
  resolver.AddReshape();

  static tflite::MicroInterpreter static_interpreter(
    model, resolver, tensor_arena, kTensorArenaSize
  );

  interpreter = &static_interpreter;

  if (interpreter->AllocateTensors() != kTfLiteOk) {
    Serial.println("Tensor allocation failed!");
    while (1);
  }

  input = interpreter->input(0);
  output = interpreter->output(0);

  Serial.println("Model Loaded Successfully");
}

// ===================== LOOP =====================
void loop() {

  // -------- SENSOR READINGS --------
  float light = getLight();
  float temp = getTemperature();
  float humidity = getHumidity();
  float sound = getSound();

  // -------- NORMALIZATION --------
  float features[4];

  features[0] = normalize(light,    min_vals[0], max_vals[0]);
  features[1] = normalize(temp,     min_vals[1], max_vals[1]);
  features[2] = normalize(humidity, min_vals[2], max_vals[2]);
  features[3] = normalize(sound,    min_vals[3], max_vals[3]);

  // -------- SET INPUT --------
  for (int i = 0; i < 4; i++) {
    input->data.f[i] = features[i];
  }

  // -------- INFERENCE --------
  if (interpreter->Invoke() != kTfLiteOk) {
    Serial.println("Inference failed!");
    return;
  }

  float no_move = output->data.f[0];
  float move = output->data.f[1];

  bool is_movement = move > no_move;

  // -------- OUTPUT CONTROL --------
  digitalWrite(LED_PIN, is_movement ? HIGH : LOW);

  // -------- DEBUG --------
  Serial.println("----- SENSOR -----");
  Serial.print("Light: "); Serial.println(light);
  Serial.print("Temp: "); Serial.println(temp);
  Serial.print("Humidity: "); Serial.println(humidity);
  Serial.print("Sound: "); Serial.println(sound);

  Serial.println("----- RESULT -----");
  Serial.print("No Move: "); Serial.println(no_move, 3);
  Serial.print("Move: "); Serial.println(move, 3);
  Serial.print("Prediction: ");
  Serial.println(is_movement ? "MOVEMENT" : "NO MOVEMENT");

  Serial.println("--------------------\n");

  delay(1000);
}