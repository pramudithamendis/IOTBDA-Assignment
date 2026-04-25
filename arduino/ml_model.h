#ifndef ML_MODEL_H
#define ML_MODEL_H

// -------------------- MODEL --------------------
static const float bias = 101.7063;

static const float weights[10] = {
  -7.4031, -6.6868, -1.5147, -9.7322, -14.1521,
  -5.8496, -0.2711, -2.1928, -3.2642, -3.2657
};

// -------------------- SCALER --------------------
static const float min_vals[10] = {
  45.916084, 64.000000, 1.936219, 0.000000, 0.000000,
  1.670000, 0.000000, 0.000000, 0.000000, 0.000000
};

static const float max_vals[10] = {
  383.005988, 405.000000, 100.483216, 101.000000, 0.400000,
  143.598023, 31.783130, 289.000000, 1.436494, 4.587417
};

// -------------------- NORMALIZATION (SAFE COPY) --------------------
inline void normalize(const float in[10], float out[10]) {
  for (int i = 0; i < 10; i++) {
    float range = (max_vals[i] - min_vals[i]);
    out[i] = (in[i] - min_vals[i]) / (range + 1e-8f);
  }
}

// -------------------- PREDICTION --------------------
inline float predict(const float raw[10]) {

  float x[10];
  normalize(raw, x);

  float score = bias;

  for (int i = 0; i < 10; i++) {
    score += weights[i] * x[i];
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return score;
}

#endif