# Training Data

Due to file size limitations, training data is hosted on OneDrive.

## Available Datasets

### Raw MongoDB Export
- **File:** `SphereSleep.sensor_data.csv` (5.87 MB)
- **Records:** 61,318 sensor readings
- **Link:** [Download from OneDrive](https://mysliit-my.sharepoint.com/:x:/g/personal/it22124012_my_sliit_lk/IQDUETnrThtBQJsaT6yKXLKlAS0UWqqTQI4lrhulzjejFOw)
- **Description:** Raw export from MongoDB `sensor_data` collection

### Cleaned Data with Labels
- **File:** `output_with_thermal_anomaly.csv` (5.03 MB)
- **Records:** 61,315 labeled readings
- **Link:** [Download from OneDrive](https://mysliit-my.sharepoint.com/:x:/g/personal/it22124012_my_sliit_lk/IQD1LhwJ8VCJSKDVe0eNUjioAXuc6nJ-e06fMiCtZDP1NnQ)
- **Description:** Processed data with thermal anomaly labels for TinyML training

## How to Use

1. Download the CSV files from OneDrive links above
2. Place in `project/notebooks/cleaning/` directory
3. Run `temp_humidity_cleaning.ipynb` or `Temp_Humidity_TinyML.ipynb`

## Regenerating Data

Alternatively, export fresh data from MongoDB:

```bash
cd backend
python export_mongodb_to_csv.py
```

This will create `SphereSleep.sensor_data.csv` from the current database.