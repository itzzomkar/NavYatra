"""
Enhanced ML Feedback Loop for KMRL Train Induction System
This module implements continuous learning from historical decisions
to improve future optimization predictions.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class FeedbackType(Enum):
    """Types of feedback for the learning system"""
    SCHEDULE_SUCCESS = "schedule_success"
    SCHEDULE_FAILURE = "schedule_failure"
    MAINTENANCE_PREDICTION = "maintenance_prediction"
    ENERGY_OPTIMIZATION = "energy_optimization"
    CONFLICT_RESOLUTION = "conflict_resolution"
    MILEAGE_BALANCE = "mileage_balance"

@dataclass
class ScheduleOutcome:
    """Data structure for schedule execution outcomes"""
    schedule_id: str
    timestamp: datetime
    trainset_ids: List[str]
    planned_metrics: Dict[str, float]
    actual_metrics: Dict[str, float]
    feedback_type: FeedbackType
    success_score: float
    operator_feedback: Optional[str] = None
    
class MLFeedbackLoop:
    """
    Advanced ML Feedback Loop for continuous improvement
    """
    
    def __init__(self, model_dir: str = "./ml_models"):
        self.model_dir = model_dir
        self.models = {}
        self.scalers = {}
        self.performance_history = []
        self.feature_importance = {}
        self.learning_rate = 0.01
        self.batch_size = 100
        
        # Initialize models for different optimization aspects
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize ML models for different optimization aspects"""
        
        # Model for predicting maintenance requirements
        self.models['maintenance'] = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        # Model for energy consumption prediction
        self.models['energy'] = GradientBoostingRegressor(
            n_estimators=150,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        # Model for conflict probability
        self.models['conflict'] = RandomForestRegressor(
            n_estimators=80,
            max_depth=8,
            random_state=42
        )
        
        # Model for schedule success prediction
        self.models['success'] = GradientBoostingRegressor(
            n_estimators=120,
            learning_rate=0.05,
            max_depth=6,
            random_state=42
        )
        
        # Initialize scalers for feature normalization
        for model_name in self.models.keys():
            self.scalers[model_name] = StandardScaler()
            
    def process_feedback(self, outcome: ScheduleOutcome) -> Dict[str, Any]:
        """
        Process feedback from executed schedules
        """
        try:
            # Extract features from the outcome
            features = self._extract_features(outcome)
            
            # Calculate performance metrics
            performance = self._calculate_performance(outcome)
            
            # Update models based on feedback type
            if outcome.feedback_type == FeedbackType.SCHEDULE_SUCCESS:
                self._update_success_model(features, performance)
            elif outcome.feedback_type == FeedbackType.MAINTENANCE_PREDICTION:
                self._update_maintenance_model(features, outcome)
            elif outcome.feedback_type == FeedbackType.ENERGY_OPTIMIZATION:
                self._update_energy_model(features, outcome)
                
            # Store feedback for batch learning
            self.performance_history.append({
                'timestamp': outcome.timestamp,
                'features': features,
                'performance': performance,
                'feedback_type': outcome.feedback_type.value
            })
            
            # Trigger batch learning if threshold reached
            if len(self.performance_history) >= self.batch_size:
                self._batch_learn()
                
            return {
                'status': 'processed',
                'performance': performance,
                'model_updated': len(self.performance_history) >= self.batch_size
            }
            
        except Exception as e:
            logger.error(f"Error processing feedback: {str(e)}")
            return {'status': 'error', 'message': str(e)}
            
    def _extract_features(self, outcome: ScheduleOutcome) -> np.ndarray:
        """Extract features from schedule outcome"""
        features = []
        
        # Time-based features
        features.append(outcome.timestamp.hour)
        features.append(outcome.timestamp.weekday())
        features.append(outcome.timestamp.day)
        features.append(outcome.timestamp.month)
        
        # Trainset count and distribution
        features.append(len(outcome.trainset_ids))
        
        # Planned metrics features
        for key in ['mileage_balance', 'energy_efficiency', 'maintenance_score']:
            features.append(outcome.planned_metrics.get(key, 0))
            
        # Historical performance (if available)
        if self.performance_history:
            recent_performance = [h['performance'] for h in self.performance_history[-10:]]
            features.append(np.mean(recent_performance))
            features.append(np.std(recent_performance))
        else:
            features.extend([0.5, 0.1])  # Default values
            
        return np.array(features)
        
    def _calculate_performance(self, outcome: ScheduleOutcome) -> float:
        """Calculate overall performance score"""
        
        # Compare planned vs actual metrics
        performance_scores = []
        
        for metric_key in outcome.planned_metrics.keys():
            if metric_key in outcome.actual_metrics:
                planned = outcome.planned_metrics[metric_key]
                actual = outcome.actual_metrics[metric_key]
                
                # Calculate deviation (lower is better)
                if planned > 0:
                    deviation = abs(planned - actual) / planned
                    score = max(0, 1 - deviation)
                    performance_scores.append(score)
                    
        # Weight by success score
        if performance_scores:
            base_performance = np.mean(performance_scores)
            weighted_performance = base_performance * outcome.success_score
            return weighted_performance
        
        return outcome.success_score
        
    def _update_success_model(self, features: np.ndarray, performance: float):
        """Update the success prediction model"""
        
        # Add to training data
        if not hasattr(self, 'success_training_data'):
            self.success_training_data = []
            
        self.success_training_data.append((features, performance))
        
        # Retrain if enough data
        if len(self.success_training_data) >= 50:
            X = np.array([d[0] for d in self.success_training_data])
            y = np.array([d[1] for d in self.success_training_data])
            
            X_scaled = self.scalers['success'].fit_transform(X)
            self.models['success'].fit(X_scaled, y)
            
            # Calculate feature importance
            self.feature_importance['success'] = self.models['success'].feature_importances_
            
    def _update_maintenance_model(self, features: np.ndarray, outcome: ScheduleOutcome):
        """Update the maintenance prediction model"""
        
        # Extract maintenance-specific metrics
        maintenance_score = outcome.actual_metrics.get('maintenance_hours', 0)
        
        if not hasattr(self, 'maintenance_training_data'):
            self.maintenance_training_data = []
            
        self.maintenance_training_data.append((features, maintenance_score))
        
        # Retrain if enough data
        if len(self.maintenance_training_data) >= 30:
            X = np.array([d[0] for d in self.maintenance_training_data])
            y = np.array([d[1] for d in self.maintenance_training_data])
            
            X_scaled = self.scalers['maintenance'].fit_transform(X)
            self.models['maintenance'].fit(X_scaled, y)
            
    def _update_energy_model(self, features: np.ndarray, outcome: ScheduleOutcome):
        """Update the energy consumption model"""
        
        energy_consumption = outcome.actual_metrics.get('energy_kwh', 0)
        
        if not hasattr(self, 'energy_training_data'):
            self.energy_training_data = []
            
        self.energy_training_data.append((features, energy_consumption))
        
        # Retrain if enough data
        if len(self.energy_training_data) >= 30:
            X = np.array([d[0] for d in self.energy_training_data])
            y = np.array([d[1] for d in self.energy_training_data])
            
            X_scaled = self.scalers['energy'].fit_transform(X)
            self.models['energy'].fit(X_scaled, y)
            
    def _batch_learn(self):
        """Perform batch learning on accumulated feedback"""
        
        logger.info(f"Starting batch learning with {len(self.performance_history)} samples")
        
        # Prepare data for batch learning
        X = np.array([h['features'] for h in self.performance_history])
        y = np.array([h['performance'] for h in self.performance_history])
        
        # Split data for training and validation
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train success model
        X_train_scaled = self.scalers['success'].fit_transform(X_train)
        X_val_scaled = self.scalers['success'].transform(X_val)
        
        self.models['success'].fit(X_train_scaled, y_train)
        
        # Evaluate model
        predictions = self.models['success'].predict(X_val_scaled)
        mae = mean_absolute_error(y_val, predictions)
        r2 = r2_score(y_val, predictions)
        
        logger.info(f"Batch learning complete. MAE: {mae:.4f}, R2: {r2:.4f}")
        
        # Save updated models
        self._save_models()
        
        # Clear history after batch learning
        self.performance_history = []
        
    def predict_schedule_success(self, schedule_features: Dict[str, Any]) -> Dict[str, float]:
        """
        Predict success probability for a proposed schedule
        """
        try:
            # Convert features to array
            features = self._dict_to_features(schedule_features)
            
            predictions = {}
            
            # Predict with each model
            if hasattr(self.models['success'], 'n_estimators'):
                features_scaled = self.scalers['success'].transform([features])
                predictions['success_probability'] = float(
                    self.models['success'].predict(features_scaled)[0]
                )
                
            if hasattr(self.models['maintenance'], 'n_estimators'):
                features_scaled = self.scalers['maintenance'].transform([features])
                predictions['maintenance_hours'] = float(
                    self.models['maintenance'].predict(features_scaled)[0]
                )
                
            if hasattr(self.models['energy'], 'n_estimators'):
                features_scaled = self.scalers['energy'].transform([features])
                predictions['energy_consumption'] = float(
                    self.models['energy'].predict(features_scaled)[0]
                )
                
            return predictions
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return {
                'success_probability': 0.5,
                'maintenance_hours': 0,
                'energy_consumption': 0
            }
            
    def _dict_to_features(self, feature_dict: Dict[str, Any]) -> np.ndarray:
        """Convert feature dictionary to numpy array"""
        features = []
        
        # Extract standard features
        features.append(feature_dict.get('hour', 0))
        features.append(feature_dict.get('weekday', 0))
        features.append(feature_dict.get('day', 1))
        features.append(feature_dict.get('month', 1))
        features.append(feature_dict.get('trainset_count', 0))
        features.append(feature_dict.get('mileage_balance', 0))
        features.append(feature_dict.get('energy_efficiency', 0))
        features.append(feature_dict.get('maintenance_score', 0))
        features.append(feature_dict.get('recent_performance_mean', 0.5))
        features.append(feature_dict.get('recent_performance_std', 0.1))
        
        return np.array(features)
        
    def get_insights(self) -> Dict[str, Any]:
        """
        Get insights from the ML models
        """
        insights = {
            'model_performance': {},
            'feature_importance': self.feature_importance,
            'learning_progress': len(self.performance_history),
            'recommendations': []
        }
        
        # Add model-specific insights
        if self.performance_history:
            recent_performance = [h['performance'] for h in self.performance_history[-20:]]
            insights['model_performance'] = {
                'mean_performance': np.mean(recent_performance),
                'performance_trend': 'improving' if np.mean(recent_performance[-10:]) > np.mean(recent_performance[-20:-10]) else 'declining',
                'consistency': 1 - np.std(recent_performance)
            }
            
        # Generate recommendations based on patterns
        if 'success' in self.feature_importance:
            top_features_idx = np.argsort(self.feature_importance['success'])[-3:]
            feature_names = ['hour', 'weekday', 'day', 'month', 'trainset_count', 
                           'mileage_balance', 'energy_efficiency', 'maintenance_score',
                           'recent_performance_mean', 'recent_performance_std']
            
            for idx in top_features_idx:
                if idx < len(feature_names):
                    insights['recommendations'].append(
                        f"Focus on optimizing {feature_names[idx]} - high impact on success"
                    )
                    
        return insights
        
    def _save_models(self):
        """Save trained models to disk"""
        import os
        
        os.makedirs(self.model_dir, exist_ok=True)
        
        for model_name, model in self.models.items():
            if hasattr(model, 'n_estimators'):  # Check if model is trained
                model_path = os.path.join(self.model_dir, f"{model_name}_model.pkl")
                joblib.dump(model, model_path)
                
                scaler_path = os.path.join(self.model_dir, f"{model_name}_scaler.pkl")
                joblib.dump(self.scalers[model_name], scaler_path)
                
        logger.info(f"Models saved to {self.model_dir}")
        
    def load_models(self):
        """Load pre-trained models from disk"""
        import os
        
        for model_name in self.models.keys():
            model_path = os.path.join(self.model_dir, f"{model_name}_model.pkl")
            scaler_path = os.path.join(self.model_dir, f"{model_name}_scaler.pkl")
            
            if os.path.exists(model_path):
                self.models[model_name] = joblib.load(model_path)
                
            if os.path.exists(scaler_path):
                self.scalers[model_name] = joblib.load(scaler_path)
                
        logger.info("Models loaded successfully")
        

# Example usage
if __name__ == "__main__":
    # Initialize feedback loop
    ml_feedback = MLFeedbackLoop()
    
    # Simulate schedule outcome
    outcome = ScheduleOutcome(
        schedule_id="SCH_001",
        timestamp=datetime.now(),
        trainset_ids=["TS001", "TS002", "TS003"],
        planned_metrics={
            'mileage_balance': 0.85,
            'energy_efficiency': 0.78,
            'maintenance_score': 0.92
        },
        actual_metrics={
            'mileage_balance': 0.83,
            'energy_efficiency': 0.75,
            'maintenance_score': 0.90,
            'energy_kwh': 1250.5,
            'maintenance_hours': 2.5
        },
        feedback_type=FeedbackType.SCHEDULE_SUCCESS,
        success_score=0.88,
        operator_feedback="Schedule executed successfully with minor adjustments"
    )
    
    # Process feedback
    result = ml_feedback.process_feedback(outcome)
    print(f"Feedback processed: {result}")
    
    # Get predictions for new schedule
    schedule_features = {
        'hour': 21,
        'weekday': 2,
        'day': 15,
        'month': 12,
        'trainset_count': 20,
        'mileage_balance': 0.82,
        'energy_efficiency': 0.76,
        'maintenance_score': 0.88
    }
    
    predictions = ml_feedback.predict_schedule_success(schedule_features)
    print(f"Predictions: {predictions}")
    
    # Get insights
    insights = ml_feedback.get_insights()
    print(f"Insights: {insights}")