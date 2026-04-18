"""
Sleep Quality Prediction and Analysis System

Implements complete ML pipeline with:
1. Decision Tree Regression for sleep quality prediction
2. Anomaly Detection using Isolation Forest
3. Clustering for sleep pattern discovery
4. Feature correlation analysis
"""

import pandas as pd
import numpy as np
from pymongo import MongoClient
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.tree import DecisionTreeRegressor, plot_tree
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, silhouette_score
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from datetime import datetime
from dotenv import load_dotenv
import os
import logging
from pathlib import Path
import json

load_dotenv()

Path('models').mkdir(exist_ok=True)
Path('visualizations').mkdir(exist_ok=True)
Path('logs').mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/ml_analysis.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SleepQualityAnalytics:
    """
    Complete ML analytics system for sleep quality prediction and analysis.
    """
    
    def __init__(self):
        self.mongo_uri = os.getenv('MONGO_URI')
        self.db_name = os.getenv('DB_NAME')
        self.collection_name = os.getenv('COLLECTION_NAME')
        
        self.regression_model = None
        self.anomaly_model = None
        self.clustering_model = None
        self.scaler = None
        self.feature_names = None
        
    def fetch_data(self):
        """Retrieve sensor readings from MongoDB."""
        try:
            client = MongoClient(self.mongo_uri)
            db = client[self.db_name]
            collection = db[self.collection_name]
            
            data = list(collection.find({}))
            df = pd.DataFrame(data)
            
            logger.info(f"Retrieved {len(data)} sensor readings")
            return df
            
        except Exception as e:
            logger.error(f"Failed to fetch data: {e}")
            return None
    
    def preprocess_data(self, df):
        """Clean and prepare sensor data."""
        if '_id' in df.columns:
            df = df.drop(columns=['_id'])
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values('timestamp')
        df = df.drop_duplicates(subset=['timestamp', 'user_id', 'session_id'])
        df = df.ffill().bfill()
        
        df = df[
            (df['temperature'] > 15) & (df['temperature'] < 40) &
            (df['humidity'] > 20) & (df['humidity'] < 100) &
            (df['light_intensity'] >= 0) & (df['light_intensity'] < 1000) &
            (df['sound_level'] >= 0) & (df['sound_level'] < 120)
        ]
        
        logger.info(f"Preprocessed {len(df)} valid readings from {df['session_id'].nunique()} sessions")
        return df
    
    def aggregate_sessions(self, df):
        """Aggregate sensor readings into overnight sleep sessions."""
        sessions = []
        
        for session_id, session_data in df.groupby('session_id'):
            # RELAXED CONSTRAINTS FOR TESTING
            if len(session_data) < 10: 
                continue
            
            duration_hours = (
                session_data['timestamp'].max() - 
                session_data['timestamp'].min()
            ).total_seconds() / 3600
            
            if duration_hours < 1: 
                continue
            
            temps = session_data['temperature']
            humidity = session_data['humidity']
            light = session_data['light_intensity']
            sound = session_data['sound_level']
            
            features = {
                'session_id': session_id,
                'user_id': session_data['user_id'].iloc[0],
                
                'avg_temperature': temps.mean(),
                'max_temperature': temps.max(),
                'min_temperature': temps.min(),
                'temp_range': temps.max() - temps.min(),
                'temp_std': temps.std(),
                'temp_above_28_count': (temps > 28).sum(),
                'temp_above_28_pct': (temps > 28).mean() * 100,
                'temp_below_24_count': (temps < 24).sum(),
                'temp_deviation_from_optimal': temps.apply(
                    lambda x: abs(x - 25.5) if x < 24 or x > 27 else 0
                ).mean(),
                
                'avg_humidity': humidity.mean(),
                'max_humidity': humidity.max(),
                'min_humidity': humidity.min(),
                'humidity_std': humidity.std(),
                'high_humidity_count': (humidity > 70).sum(),
                'high_humidity_pct': (humidity > 70).mean() * 100,
                'humidity_deviation': humidity.apply(
                    lambda x: abs(x - 50) if x < 40 or x > 60 else 0
                ).mean(),
                
                'thermal_discomfort_score': self._calculate_thermal_discomfort(
                    temps.mean(), humidity.mean()
                ),
                
                'avg_light': light.mean(),
                'max_light': light.max(),
                'min_light': light.min(),
                'light_std': light.std(),
                'light_exposure_minutes': (light > 10).sum() * 2,
                'light_spikes': (light > 50).sum(),
                
                'avg_sound': sound.mean(),
                'max_noise': sound.max(),
                'min_noise': sound.min(),
                'sound_std': sound.std(),
                'noise_disturbances': (sound > 40).sum(),
                'noise_spikes': (sound > 60).sum(),
                
                'motion_events': session_data['motion_detected'].sum(),
                'avg_distance': session_data['distance'].mean(),
                'distance_variance': session_data['distance'].std(),
                
                'reading_count': len(session_data),
                'session_duration_hours': duration_hours,
                'session_date': session_data['timestamp'].iloc[0].date()
            }
            
            sessions.append(features)
        
        sessions_df = pd.DataFrame(sessions)
        logger.info(f"Aggregated {len(sessions_df)} sleep sessions")
        return sessions_df
    
    def _calculate_thermal_discomfort(self, temp, humidity):
        """Calculate thermal discomfort index."""
        temp_discomfort = 0
        if temp < 24:
            temp_discomfort = (24 - temp) * 3
        elif temp > 27:
            temp_discomfort = (temp - 27) * 4
        
        humidity_discomfort = 0
        if humidity < 40:
            humidity_discomfort = (40 - humidity) * 0.5
        elif humidity > 60:
            humidity_discomfort = (humidity - 60) * 1.0
        
        return min(100, temp_discomfort + humidity_discomfort)
    
    def calculate_sleep_quality_score(self, row):
        """Calculate sleep quality score from environmental conditions."""
        score = 100
        
        # Temperature scoring (optimal: 24-27°C)
        temp = row['avg_temperature']
        if temp < 24:
            score -= (24 - temp) * 2
        elif temp > 27:
            score -= (temp - 27) * 3
        
        # Humidity scoring (optimal: 40-60%)
        humidity = row['avg_humidity']
        if humidity < 40:
            score -= (40 - humidity) * 0.5
        elif humidity > 60:
            score -= (humidity - 60) * 0.8
        
        # Noise scoring (penalize high noise)
        if row['max_noise'] > 50:
            score -= (row['max_noise'] - 50) * 0.3
        
        # Light scoring (penalize bright light)
        if row['avg_light'] > 15:
            score -= (row['avg_light'] - 15) * 0.2
        
        # Motion scoring (penalize high motion)
        if row['motion_events'] > 30:
            score -= (row['motion_events'] - 30) * 0.1
        
        return max(30, min(100, round(score, 1)))

    
    def add_target_variable(self, sessions_df):
        """Calculate sleep quality scores."""
        sessions_df['sleep_quality_score'] = sessions_df.apply(
            self.calculate_sleep_quality_score, 
            axis=1
        )
        
        logger.info(f"Sleep quality scores - Mean: {sessions_df['sleep_quality_score'].mean():.1f}, "
                   f"Std: {sessions_df['sleep_quality_score'].std():.1f}, "
                   f"Min: {sessions_df['sleep_quality_score'].min():.1f}, "
                   f"Max: {sessions_df['sleep_quality_score'].max():.1f}")
        
        # Log first few scores with their conditions for debugging
        for idx, row in sessions_df.head(3).iterrows():
            logger.info(f"Session {row['session_id']}: "
                       f"Temp={row['avg_temperature']:.1f}°C, "
                       f"Humidity={row['avg_humidity']:.1f}%, "
                       f"Noise={row['max_noise']:.1f}dB -> "
                       f"Score={row['sleep_quality_score']:.1f}")
        
        return sessions_df
    
    # ============================================
    # ANALYSIS 1: TEMPORAL TREND ANALYSIS
    # Decision Tree Regression
    # ============================================
    
    def train_regression_model(self, sessions_df):
        """Train decision tree regressor."""
        logger.info("="*70)
        logger.info("ANALYSIS 1: TEMPORAL TREND ANALYSIS - Decision Tree Regression")
        logger.info("="*70)
        
        feature_columns = [
            'avg_temperature', 'max_temperature', 'min_temperature', 'temp_range', 'temp_std',
            'temp_above_28_count', 'temp_above_28_pct', 'temp_below_24_count',
            'temp_deviation_from_optimal', 'thermal_discomfort_score',
            'avg_humidity', 'max_humidity', 'min_humidity', 'humidity_std',
            'high_humidity_count', 'humidity_deviation',
            'avg_light', 'max_light', 'light_exposure_minutes', 'light_spikes',
            'avg_sound', 'max_noise', 'noise_disturbances', 'noise_spikes',
            'motion_events', 'avg_distance', 'distance_variance'
        ]
        
        X = sessions_df[feature_columns]
        y = sessions_df['sleep_quality_score']
        
        # Adjust test size and CV based on available data
        n_samples = len(X)
        
        if n_samples < 10:
            logger.warning(f"Only {n_samples} sessions - using simple train without CV")
            
            # Simple train without test split if too few samples
            self.regression_model = DecisionTreeRegressor(
                max_depth=5,
                min_samples_split=2,
                min_samples_leaf=1,
                random_state=42
            )
            self.regression_model.fit(X, y)
            self.feature_names = feature_columns
            
            y_pred = self.regression_model.predict(X)
            train_mae = mean_absolute_error(y, y_pred)
            train_r2 = r2_score(y, y_pred)
            
            logger.info(f"Decision Tree Performance (Training only):")
            logger.info(f"  MAE: {train_mae:.2f}")
            logger.info(f"  R²: {train_r2:.3f}")
            
            sessions_df['predicted_quality'] = y_pred
            
            return sessions_df, X, y, y_pred
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Adjust CV folds based on sample size
        cv_folds = min(5, len(X_train))
        
        param_grid = {
            'max_depth': [3, 5, 7],
            'min_samples_split': [2, 5],
            'min_samples_leaf': [1, 2]
        }
        
        dt_model = DecisionTreeRegressor(random_state=42)
        grid_search = GridSearchCV(
            dt_model, param_grid, cv=cv_folds,
            scoring='neg_mean_absolute_error', n_jobs=-1
        )
        grid_search.fit(X_train, y_train)
        
        self.regression_model = grid_search.best_estimator_
        self.feature_names = feature_columns
        
        y_test_pred = self.regression_model.predict(X_test)
        
        test_mae = mean_absolute_error(y_test, y_test_pred)
        test_r2 = r2_score(y_test, y_test_pred)
        
        logger.info(f"Decision Tree Performance:")
        logger.info(f"  Test MAE: {test_mae:.2f}")
        logger.info(f"  Test R²: {test_r2:.3f}")
        
        sessions_df['predicted_quality'] = self.regression_model.predict(X)
        
        return sessions_df, X_test, y_test, y_test_pred
    
    # ============================================
    # ANALYSIS 2: CORRELATION ANALYSIS
    # Feature Importance from Decision Tree
    # ============================================
    
    def analyze_feature_correlation(self):
        """Analyze feature importance and correlations."""
        logger.info("="*70)
        logger.info("ANALYSIS 2: CORRELATION ANALYSIS - Feature Importance")
        logger.info("="*70)
        
        importance = self.regression_model.feature_importances_
        
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        logger.info(f"Top 10 Most Important Features:")
        for idx, row in importance_df.head(10).iterrows():
            logger.info(f"  {row['feature']}: {row['importance']:.4f}")
        
        temp_humid_features = [f for f in self.feature_names if any(
            keyword in f for keyword in ['temp', 'humid', 'thermal']
        )]
        temp_humid_importance = importance_df[
            importance_df['feature'].isin(temp_humid_features)
        ]
        
        logger.info(f"Temperature/Humidity Combined Importance: {temp_humid_importance['importance'].sum():.1%}")
        
        plt.figure(figsize=(12, 8))
        sns.barplot(data=importance_df.head(15), y='feature', x='importance', palette='viridis')
        plt.title('Feature Importance - Sleep Quality Prediction', fontsize=14, fontweight='bold')
        plt.xlabel('Importance Score')
        plt.ylabel('Feature')
        plt.tight_layout()
        plt.savefig('visualizations/feature_importance.png', dpi=300)
        plt.close()
        
        return importance_df
    
    # ============================================
    # ANALYSIS 3: ANOMALY DETECTION
    # Isolation Forest for Unusual Patterns
    # ============================================
    
    def detect_anomalies(self, sessions_df):
        """Detect anomalous sleep environment patterns using Isolation Forest."""
        logger.info("="*70)
        logger.info("ANALYSIS 3: ANOMALY DETECTION - Isolation Forest")
        logger.info("="*70)
        
        anomaly_features = [
            'avg_temperature', 'avg_humidity', 'thermal_discomfort_score',
            'max_noise', 'avg_light', 'motion_events'
        ]
        
        X_anomaly = sessions_df[anomaly_features]
        
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X_anomaly)
        
        self.anomaly_model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        
        # FIT THE MODEL
        self.anomaly_model.fit(X_scaled)
        
        # Use decision_function
        sessions_df['anomaly_score'] = self.anomaly_model.decision_function(X_scaled)
        sessions_df['is_anomaly'] = self.anomaly_model.predict(X_scaled)
        sessions_df['is_anomaly'] = sessions_df['is_anomaly'].map({1: 0, -1: 1})
        
        anomalies = sessions_df[sessions_df['is_anomaly'] == 1]
        
        logger.info(f"Detected {len(anomalies)} anomalous sessions ({len(anomalies)/len(sessions_df)*100:.1f}%)")
        
        if len(anomalies) > 0:
            logger.info(f"Anomaly characteristics:")
            logger.info(f"  Avg Temperature: {anomalies['avg_temperature'].mean():.1f}°C")
            logger.info(f"  Avg Humidity: {anomalies['avg_humidity'].mean():.1f}%")
            logger.info(f"  Avg Noise: {anomalies['max_noise'].mean():.1f}dB")
            logger.info(f"  Avg Sleep Quality: {anomalies['sleep_quality_score'].mean():.1f}/100")
        
        plt.figure(figsize=(12, 6))
        plt.scatter(sessions_df[sessions_df['is_anomaly']==0]['avg_temperature'],
                sessions_df[sessions_df['is_anomaly']==0]['avg_humidity'],
                c='blue', label='Normal', alpha=0.6, s=50)
        if len(anomalies) > 0:
            plt.scatter(anomalies['avg_temperature'],
                    anomalies['avg_humidity'],
                    c='red', label='Anomaly', alpha=0.8, s=100, marker='x')
        plt.xlabel('Average Temperature (°C)')
        plt.ylabel('Average Humidity (%)')
        plt.title('Anomaly Detection - Temperature vs Humidity')
        plt.legend()
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig('visualizations/anomaly_detection.png', dpi=300)
        plt.close()
        
        return sessions_df, anomalies
    
    # ============================================
    # ANALYSIS 4: CLUSTERING ANALYSIS
    # K-Means for Sleep Pattern Discovery
    # ============================================
    
    def cluster_sleep_patterns(self, sessions_df):
        """Discover sleep environment patterns using K-Means clustering."""
        logger.info("="*70)
        logger.info("ANALYSIS 4: CLUSTERING ANALYSIS - Sleep Pattern Discovery")
        logger.info("="*70)
        
        # Use SAME features as anomaly detection
        cluster_features = [
            'avg_temperature', 'avg_humidity', 'thermal_discomfort_score',
            'max_noise', 'avg_light', 'motion_events'
        ]
        
        X_cluster = sessions_df[cluster_features]
        
        # Create separate scaler for clustering
        cluster_scaler = StandardScaler()
        X_scaled = cluster_scaler.fit_transform(X_cluster)
        
        inertias = []
        silhouette_scores = []
        
        # K must be less than number of samples
        max_k = min(7, len(sessions_df) - 1)  # Max 7 clusters or n_samples-1
        K_range = range(2, max_k + 1)
        
        for k in K_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(X_scaled)
            inertias.append(kmeans.inertia_)
            silhouette_scores.append(silhouette_score(X_scaled, kmeans.labels_))
        
        optimal_k = K_range[np.argmax(silhouette_scores)]
        logger.info(f"Optimal number of clusters: {optimal_k}")
        
        self.clustering_model = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        sessions_df['cluster'] = self.clustering_model.fit_predict(X_scaled)
        
        logger.info(f"Cluster distribution:")
        for cluster_id in range(optimal_k):
            cluster_data = sessions_df[sessions_df['cluster'] == cluster_id]
            logger.info(f"  Cluster {cluster_id}: {len(cluster_data)} sessions ({len(cluster_data)/len(sessions_df)*100:.1f}%)")
            logger.info(f"    Avg Temp: {cluster_data['avg_temperature'].mean():.1f}°C")
            logger.info(f"    Avg Humidity: {cluster_data['avg_humidity'].mean():.1f}%")
            logger.info(f"    Avg Sleep Quality: {cluster_data['sleep_quality_score'].mean():.1f}/100")
        
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))
        
        axes[0].plot(K_range, inertias, marker='o')
        axes[0].set_xlabel('Number of Clusters (k)')
        axes[0].set_ylabel('Inertia')
        axes[0].set_title('Elbow Method')
        axes[0].grid(alpha=0.3)
        
        axes[1].plot(K_range, silhouette_scores, marker='o', color='orange')
        axes[1].axvline(optimal_k, color='red', linestyle='--', label=f'Optimal k={optimal_k}')
        axes[1].set_xlabel('Number of Clusters (k)')
        axes[1].set_ylabel('Silhouette Score')
        axes[1].set_title('Silhouette Analysis')
        axes[1].legend()
        axes[1].grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('visualizations/clustering_analysis.png', dpi=300)
        plt.close()
        
        plt.figure(figsize=(12, 6))
        scatter = plt.scatter(sessions_df['avg_temperature'],
                            sessions_df['avg_humidity'],
                            c=sessions_df['cluster'],
                            cmap='viridis',
                            s=100,
                            alpha=0.6)
        plt.colorbar(scatter, label='Cluster')
        plt.xlabel('Average Temperature (°C)')
        plt.ylabel('Average Humidity (%)')
        plt.title('Sleep Environment Clusters')
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig('visualizations/cluster_scatter.png', dpi=300)
        plt.close()
        
        return sessions_df
    
    # ============================================
    # ADDITIONAL VISUALIZATIONS
    # ============================================
    
    def create_visualizations(self, sessions_df, y_test, y_test_pred):
        """Generate additional visualizations."""
        
        plt.figure(figsize=(25, 15))
        plot_tree(self.regression_model, feature_names=self.feature_names, filled=True,
                 rounded=True, fontsize=8, precision=1)
        plt.title('Decision Tree Structure', fontsize=16, fontweight='bold')
        plt.tight_layout()
        plt.savefig('visualizations/decision_tree_structure.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        plt.figure(figsize=(10, 6))
        plt.scatter(y_test, y_test_pred, alpha=0.6)
        plt.plot([0, 100], [0, 100], 'r--', label='Perfect prediction')
        plt.xlabel('Actual Sleep Quality Score')
        plt.ylabel('Predicted Sleep Quality Score')
        plt.title('Actual vs Predicted Sleep Quality')
        plt.legend()
        plt.grid(alpha=0.3)
        plt.tight_layout()
        plt.savefig('visualizations/predictions_scatter.png', dpi=300)
        plt.close()
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        axes[0, 0].hist(sessions_df['sleep_quality_score'], bins=20, color='skyblue', edgecolor='black')
        axes[0, 0].set_xlabel('Sleep Quality Score')
        axes[0, 0].set_ylabel('Frequency')
        axes[0, 0].set_title('Sleep Quality Distribution')
        axes[0, 0].grid(alpha=0.3)
        
        axes[0, 1].scatter(sessions_df['avg_temperature'], sessions_df['sleep_quality_score'], alpha=0.6)
        axes[0, 1].set_xlabel('Average Temperature (°C)')
        axes[0, 1].set_ylabel('Sleep Quality Score')
        axes[0, 1].set_title('Temperature vs Sleep Quality')
        axes[0, 1].grid(alpha=0.3)
        
        axes[1, 0].scatter(sessions_df['avg_humidity'], sessions_df['sleep_quality_score'], alpha=0.6, color='orange')
        axes[1, 0].set_xlabel('Average Humidity (%)')
        axes[1, 0].set_ylabel('Sleep Quality Score')
        axes[1, 0].set_title('Humidity vs Sleep Quality')
        axes[1, 0].grid(alpha=0.3)
        
        axes[1, 1].scatter(sessions_df['thermal_discomfort_score'], sessions_df['sleep_quality_score'], alpha=0.6, color='red')
        axes[1, 1].set_xlabel('Thermal Discomfort Score')
        axes[1, 1].set_ylabel('Sleep Quality Score')
        axes[1, 1].set_title('Thermal Discomfort vs Sleep Quality')
        axes[1, 1].grid(alpha=0.3)
        
        plt.tight_layout()
        plt.savefig('visualizations/correlation_plots.png', dpi=300)
        plt.close()
        
        logger.info("All visualizations saved")
    
    # ============================================
    # SAVE MODELS AND RESULTS
    # ============================================
    
    def save_models(self, sessions_df, importance_df, anomalies):
        """Save all trained models and analysis results."""
        
        joblib.dump(self.regression_model, 'models/decision_tree_model.pkl')
        joblib.dump(self.anomaly_model, 'models/anomaly_model.pkl')
        joblib.dump(self.clustering_model, 'models/clustering_model.pkl')
        joblib.dump(self.scaler, 'models/scaler.pkl')
        joblib.dump(self.feature_names, 'models/feature_names.pkl')
        
        metadata = {
            'created_date': datetime.now().isoformat(),
            'total_sessions': len(sessions_df),
            
            'regression_model': {
                'type': 'DecisionTreeRegressor',
                'num_features': len(self.feature_names),
                'hyperparameters': {
                    'max_depth': self.regression_model.max_depth,
                    'min_samples_split': self.regression_model.min_samples_split,
                    'min_samples_leaf': self.regression_model.min_samples_leaf
                },
                'top_features': importance_df.head(5).to_dict('records')
            },
            
            'anomaly_detection': {
                'type': 'IsolationForest',
                'contamination': 0.1,
                'num_anomalies': int((sessions_df['is_anomaly'] == 1).sum()),
                'anomaly_percentage': float((sessions_df['is_anomaly'] == 1).mean() * 100)
            },
            
            'clustering': {
                'type': 'KMeans',
                'num_clusters': self.clustering_model.n_clusters,
                'cluster_distribution': sessions_df['cluster'].value_counts().to_dict()
            },
            
            'analysis_summary': {
                'mean_sleep_quality': float(sessions_df['sleep_quality_score'].mean()),
                'std_sleep_quality': float(sessions_df['sleep_quality_score'].std()),
                'mean_temperature': float(sessions_df['avg_temperature'].mean()),
                'mean_humidity': float(sessions_df['avg_humidity'].mean())
            }
        }
        
        with open('models/analysis_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        sessions_df.to_csv('models/analyzed_sessions.csv', index=False)
        anomalies.to_csv('models/detected_anomalies.csv', index=False)
        
        logger.info("All models and results saved")
    
    # ============================================
    # MAIN PIPELINE
    # ============================================
    
    def run_complete_analysis(self):
        """Execute complete ML analysis pipeline."""
        logger.info("="*70)
        logger.info("SPHERESLEEP ML ANALYSIS SYSTEM")
        logger.info("="*70)
        
        df = self.fetch_data()
        if df is None or len(df) == 0:
            logger.error("No data available")
            return
        
        df = self.preprocess_data(df)
        sessions_df = self.aggregate_sessions(df)
        
        if len(sessions_df) < 10:
            logger.warning(f"Only {len(sessions_df)} sessions available")
        
        sessions_df = self.add_target_variable(sessions_df)
        
        sessions_df, X_test, y_test, y_pred = self.train_regression_model(sessions_df)
        
        importance_df = self.analyze_feature_correlation()
        
        sessions_df, anomalies = self.detect_anomalies(sessions_df)
        
        sessions_df = self.cluster_sleep_patterns(sessions_df)
        
        self.create_visualizations(sessions_df, y_test, y_pred)
        
        self.save_models(sessions_df, importance_df, anomalies)
        
        logger.info("COMPLETE ML ANALYSIS FINISHED")


if __name__ == "__main__":
    analytics = SleepQualityAnalytics()
    analytics.run_complete_analysis()