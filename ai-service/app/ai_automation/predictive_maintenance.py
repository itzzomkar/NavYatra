"""
Predictive Maintenance AI System for KMRL Train Induction
Uses advanced machine learning to predict maintenance needs and failures
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import joblib
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score
import warnings
warnings.filterwarnings('ignore')

from loguru import logger


class MaintenanceType(Enum):
    """Types of maintenance"""
    PREVENTIVE = "preventive"
    PREDICTIVE = "predictive"
    CORRECTIVE = "corrective"
    EMERGENCY = "emergency"


class ComponentHealth(Enum):
    """Component health status"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"


@dataclass
class MaintenancePrediction:
    """Represents a maintenance prediction"""
    trainset_id: str
    component: str
    maintenance_type: MaintenanceType
    predicted_failure_date: datetime
    confidence: float
    urgency_score: float
    health_status: ComponentHealth
    remaining_useful_life: int  # days
    recommended_action: str
    cost_estimate: float
    risk_assessment: Dict[str, float]


@dataclass
class TrainsetTelemetry:
    """Telemetry data from trainsets"""
    trainset_id: str
    timestamp: datetime
    mileage: float
    engine_temperature: float
    brake_pressure: float
    door_cycles: int
    hvac_efficiency: float
    battery_voltage: float
    vibration_level: float
    noise_level: float
    power_consumption: float
    speed_profile: List[float]
    failure_codes: List[str]


class PredictiveMaintenanceAI:
    """
    Advanced Predictive Maintenance AI System
    """
    
    def __init__(self, model_dir: str = "./ml_models/predictive_maintenance"):
        self.model_dir = model_dir
        self.models = {}
        self.scalers = {}
        self.anomaly_detectors = {}
        
        # Component-specific models
        self.components = [
            'engine', 'brakes', 'doors', 'hvac', 'battery', 
            'suspension', 'electrical', 'communication'
        ]
        
        # Initialize models for each component
        self._initialize_models()
        
        # Historical data for training
        self.telemetry_history = []
        self.maintenance_history = []
        
    def _initialize_models(self):
        """Initialize ML models for each component"""
        
        for component in self.components:
            # Failure prediction model
            self.models[f'{component}_failure'] = RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42
            )
            
            # Remaining useful life model
            self.models[f'{component}_rul'] = RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                random_state=42
            )
            
            # Anomaly detection model
            self.anomaly_detectors[component] = IsolationForest(
                n_estimators=100,
                contamination=0.1,
                random_state=42
            )
            
            # Feature scalers
            self.scalers[f'{component}_features'] = StandardScaler()
            self.scalers[f'{component}_target'] = MinMaxScaler()
            
        logger.info(f"Initialized predictive maintenance models for {len(self.components)} components")
        
    def ingest_telemetry(self, telemetry: TrainsetTelemetry):
        """Ingest real-time telemetry data"""
        
        self.telemetry_history.append(telemetry)
        
        # Keep only recent data (last 30 days)
        cutoff_date = datetime.now() - timedelta(days=30)
        self.telemetry_history = [
            t for t in self.telemetry_history 
            if t.timestamp > cutoff_date
        ]
        
        # Trigger real-time analysis
        predictions = self.analyze_trainset_health(telemetry.trainset_id)
        
        # Check for immediate risks
        critical_predictions = [
            p for p in predictions 
            if p.health_status in [ComponentHealth.POOR, ComponentHealth.CRITICAL]
        ]
        
        if critical_predictions:
            logger.warning(f"🚨 Critical maintenance predictions for {telemetry.trainset_id}")
            for pred in critical_predictions:
                logger.warning(f"   {pred.component}: {pred.health_status.value} - {pred.recommended_action}")
                
        return predictions
        
    def analyze_trainset_health(self, trainset_id: str) -> List[MaintenancePrediction]:
        """Analyze health of a specific trainset"""
        
        # Get recent telemetry for this trainset
        recent_telemetry = [
            t for t in self.telemetry_history[-100:]  # Last 100 readings
            if t.trainset_id == trainset_id
        ]
        
        if len(recent_telemetry) < 5:
            logger.warning(f"Insufficient telemetry data for {trainset_id}")
            return []
            
        predictions = []
        
        for component in self.components:
            prediction = self._predict_component_health(component, recent_telemetry)
            if prediction:
                predictions.append(prediction)
                
        # Sort by urgency
        predictions.sort(key=lambda x: x.urgency_score, reverse=True)
        
        return predictions
        
    def _predict_component_health(
        self, 
        component: str, 
        telemetry_data: List[TrainsetTelemetry]
    ) -> Optional[MaintenancePrediction]:
        """Predict health of a specific component"""
        
        try:
            # Extract features for this component
            features = self._extract_component_features(component, telemetry_data)
            
            if len(features) == 0:
                return None
                
            # Get the latest features
            latest_features = features[-1:].reshape(1, -1)
            
            # Check if models are trained
            failure_model = self.models.get(f'{component}_failure')
            rul_model = self.models.get(f'{component}_rul')
            
            if not hasattr(failure_model, 'feature_importances_'):
                # Model not trained, use rule-based approach
                return self._rule_based_prediction(component, telemetry_data[-1])
                
            # Scale features
            scaler = self.scalers[f'{component}_features']
            scaled_features = scaler.transform(latest_features)
            
            # Predict failure probability
            failure_prob = failure_model.predict(scaled_features)[0]
            
            # Predict remaining useful life
            rul_days = max(1, int(rul_model.predict(scaled_features)[0]))
            
            # Detect anomalies
            anomaly_score = self.anomaly_detectors[component].decision_function(scaled_features)[0]
            is_anomaly = self.anomaly_detectors[component].predict(scaled_features)[0] == -1
            
            # Calculate health status
            health_status = self._calculate_health_status(failure_prob, rul_days, is_anomaly)
            
            # Calculate urgency score
            urgency_score = self._calculate_urgency_score(failure_prob, rul_days, anomaly_score)
            
            # Generate recommendation
            recommendation = self._generate_recommendation(
                component, health_status, rul_days, failure_prob
            )
            
            # Estimate cost
            cost_estimate = self._estimate_maintenance_cost(component, health_status)
            
            # Risk assessment
            risk_assessment = {
                'failure_probability': float(failure_prob),
                'safety_risk': min(1.0, failure_prob * 1.2),
                'operational_risk': min(1.0, failure_prob * 0.8),
                'financial_risk': min(1.0, failure_prob * cost_estimate / 10000)
            }
            
            # Calculate predicted failure date
            predicted_failure_date = datetime.now() + timedelta(days=rul_days)
            
            return MaintenancePrediction(
                trainset_id=telemetry_data[-1].trainset_id,
                component=component,
                maintenance_type=MaintenanceType.PREDICTIVE,
                predicted_failure_date=predicted_failure_date,
                confidence=min(1.0, 1 - abs(anomaly_score) / 2),
                urgency_score=urgency_score,
                health_status=health_status,
                remaining_useful_life=rul_days,
                recommended_action=recommendation,
                cost_estimate=cost_estimate,
                risk_assessment=risk_assessment
            )
            
        except Exception as e:
            logger.error(f"Error predicting {component} health: {e}")
            return None
            
    def _extract_component_features(
        self, 
        component: str, 
        telemetry_data: List[TrainsetTelemetry]
    ) -> np.ndarray:
        """Extract features specific to a component"""
        
        features_list = []
        
        for telemetry in telemetry_data:
            features = []
            
            if component == 'engine':
                features = [
                    telemetry.engine_temperature,
                    telemetry.power_consumption,
                    np.mean(telemetry.speed_profile) if telemetry.speed_profile else 0,
                    np.std(telemetry.speed_profile) if telemetry.speed_profile else 0,
                    telemetry.vibration_level,
                    telemetry.noise_level,
                    len([code for code in telemetry.failure_codes if 'ENG' in code]),
                    telemetry.mileage
                ]
                
            elif component == 'brakes':
                features = [
                    telemetry.brake_pressure,
                    telemetry.vibration_level,
                    np.max(telemetry.speed_profile) if telemetry.speed_profile else 0,
                    len([code for code in telemetry.failure_codes if 'BRK' in code]),
                    telemetry.mileage,
                    telemetry.engine_temperature  # Heat affects brakes
                ]
                
            elif component == 'doors':
                features = [
                    telemetry.door_cycles,
                    telemetry.power_consumption,
                    len([code for code in telemetry.failure_codes if 'DOOR' in code]),
                    telemetry.noise_level
                ]
                
            elif component == 'hvac':
                features = [
                    telemetry.hvac_efficiency,
                    telemetry.power_consumption,
                    telemetry.engine_temperature,
                    len([code for code in telemetry.failure_codes if 'HVAC' in code])
                ]
                
            elif component == 'battery':
                features = [
                    telemetry.battery_voltage,
                    telemetry.power_consumption,
                    telemetry.engine_temperature,
                    len([code for code in telemetry.failure_codes if 'BAT' in code])
                ]
                
            elif component == 'suspension':
                features = [
                    telemetry.vibration_level,
                    np.std(telemetry.speed_profile) if telemetry.speed_profile else 0,
                    telemetry.mileage,
                    len([code for code in telemetry.failure_codes if 'SUSP' in code])
                ]
                
            elif component == 'electrical':
                features = [
                    telemetry.battery_voltage,
                    telemetry.power_consumption,
                    len([code for code in telemetry.failure_codes if 'ELEC' in code]),
                    telemetry.door_cycles  # Electrical load from doors
                ]
                
            elif component == 'communication':
                features = [
                    len([code for code in telemetry.failure_codes if 'COMM' in code]),
                    telemetry.power_consumption
                ]
                
            if features:
                features_list.append(features)
                
        return np.array(features_list)
        
    def _rule_based_prediction(
        self, 
        component: str, 
        latest_telemetry: TrainsetTelemetry
    ) -> MaintenancePrediction:
        """Fallback rule-based prediction when ML models aren't trained"""
        
        health_status = ComponentHealth.GOOD
        urgency_score = 0.3
        rul_days = 30
        
        # Component-specific rules
        if component == 'engine':
            if latest_telemetry.engine_temperature > 90:
                health_status = ComponentHealth.POOR
                urgency_score = 0.8
                rul_days = 7
            elif latest_telemetry.engine_temperature > 80:
                health_status = ComponentHealth.FAIR
                urgency_score = 0.5
                rul_days = 14
                
        elif component == 'brakes':
            if latest_telemetry.brake_pressure < 0.7:
                health_status = ComponentHealth.POOR
                urgency_score = 0.9
                rul_days = 3
                
        elif component == 'battery':
            if latest_telemetry.battery_voltage < 11.5:
                health_status = ComponentHealth.CRITICAL
                urgency_score = 1.0
                rul_days = 1
            elif latest_telemetry.battery_voltage < 12.0:
                health_status = ComponentHealth.POOR
                urgency_score = 0.7
                rul_days = 5
                
        # Check for failure codes
        component_codes = {
            'engine': 'ENG',
            'brakes': 'BRK',
            'doors': 'DOOR',
            'hvac': 'HVAC',
            'battery': 'BAT',
            'suspension': 'SUSP',
            'electrical': 'ELEC',
            'communication': 'COMM'
        }
        
        if component_codes[component] in ' '.join(latest_telemetry.failure_codes):
            health_status = ComponentHealth.CRITICAL
            urgency_score = 1.0
            rul_days = 1
            
        return MaintenancePrediction(
            trainset_id=latest_telemetry.trainset_id,
            component=component,
            maintenance_type=MaintenanceType.PREDICTIVE,
            predicted_failure_date=datetime.now() + timedelta(days=rul_days),
            confidence=0.6,  # Lower confidence for rule-based
            urgency_score=urgency_score,
            health_status=health_status,
            remaining_useful_life=rul_days,
            recommended_action=f"Schedule {component} inspection based on telemetry thresholds",
            cost_estimate=self._estimate_maintenance_cost(component, health_status),
            risk_assessment={
                'failure_probability': urgency_score,
                'safety_risk': urgency_score * 0.8,
                'operational_risk': urgency_score * 0.6,
                'financial_risk': urgency_score * 0.4
            }
        )
        
    def _calculate_health_status(
        self, 
        failure_prob: float, 
        rul_days: int, 
        is_anomaly: bool
    ) -> ComponentHealth:
        """Calculate component health status"""
        
        if is_anomaly or failure_prob > 0.8 or rul_days <= 2:
            return ComponentHealth.CRITICAL
        elif failure_prob > 0.6 or rul_days <= 7:
            return ComponentHealth.POOR
        elif failure_prob > 0.4 or rul_days <= 14:
            return ComponentHealth.FAIR
        elif failure_prob > 0.2 or rul_days <= 30:
            return ComponentHealth.GOOD
        else:
            return ComponentHealth.EXCELLENT
            
    def _calculate_urgency_score(
        self, 
        failure_prob: float, 
        rul_days: int, 
        anomaly_score: float
    ) -> float:
        """Calculate urgency score for maintenance"""
        
        # Combine multiple factors
        prob_score = failure_prob
        time_score = max(0, 1 - rul_days / 30)  # Higher urgency as RUL decreases
        anomaly_factor = max(0, 1 - abs(anomaly_score) / 2)
        
        urgency = (prob_score * 0.5 + time_score * 0.3 + anomaly_factor * 0.2)
        
        return min(1.0, urgency)
        
    def _generate_recommendation(
        self, 
        component: str, 
        health_status: ComponentHealth, 
        rul_days: int,
        failure_prob: float
    ) -> str:
        """Generate maintenance recommendation"""
        
        if health_status == ComponentHealth.CRITICAL:
            return f"URGENT: Immediately inspect and service {component}. Schedule within 24 hours."
        elif health_status == ComponentHealth.POOR:
            return f"HIGH PRIORITY: Schedule {component} maintenance within {min(7, rul_days)} days."
        elif health_status == ComponentHealth.FAIR:
            return f"MEDIUM PRIORITY: Plan {component} maintenance within {min(14, rul_days)} days."
        elif health_status == ComponentHealth.GOOD:
            return f"LOW PRIORITY: Consider {component} inspection within {min(30, rul_days)} days."
        else:
            return f"ROUTINE: {component} operating normally. Next check in {rul_days} days."
            
    def _estimate_maintenance_cost(
        self, 
        component: str, 
        health_status: ComponentHealth
    ) -> float:
        """Estimate maintenance cost"""
        
        base_costs = {
            'engine': 5000,
            'brakes': 2000,
            'doors': 1500,
            'hvac': 3000,
            'battery': 800,
            'suspension': 2500,
            'electrical': 1200,
            'communication': 800
        }
        
        multipliers = {
            ComponentHealth.EXCELLENT: 0.5,
            ComponentHealth.GOOD: 0.7,
            ComponentHealth.FAIR: 1.0,
            ComponentHealth.POOR: 1.5,
            ComponentHealth.CRITICAL: 2.5
        }
        
        base_cost = base_costs.get(component, 1000)
        multiplier = multipliers.get(health_status, 1.0)
        
        return base_cost * multiplier
        
    def train_models(self, historical_data: List[Dict]) -> Dict[str, float]:
        """Train ML models on historical maintenance data"""
        
        if len(historical_data) < 50:
            logger.warning("Insufficient historical data for training ML models")
            return {"error": "insufficient_data"}
            
        logger.info(f"Training predictive maintenance models on {len(historical_data)} samples")
        
        training_results = {}
        
        for component in self.components:
            try:
                # Prepare training data for this component
                X, y_failure, y_rul = self._prepare_training_data(component, historical_data)
                
                if len(X) < 20:
                    continue
                    
                # Split data
                X_train, X_test, y_failure_train, y_failure_test, y_rul_train, y_rul_test = \
                    train_test_split(X, y_failure, y_rul, test_size=0.2, random_state=42)
                    
                # Scale features
                scaler = self.scalers[f'{component}_features']
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                # Train failure prediction model
                failure_model = self.models[f'{component}_failure']
                failure_model.fit(X_train_scaled, y_failure_train)
                
                # Train RUL model
                rul_model = self.models[f'{component}_rul']
                rul_model.fit(X_train_scaled, y_rul_train)
                
                # Train anomaly detector
                anomaly_detector = self.anomaly_detectors[component]
                anomaly_detector.fit(X_train_scaled)
                
                # Evaluate models
                failure_pred = failure_model.predict(X_test_scaled)
                rul_pred = rul_model.predict(X_test_scaled)
                
                failure_mae = mean_absolute_error(y_failure_test, failure_pred)
                rul_mae = mean_absolute_error(y_rul_test, rul_pred)
                
                training_results[component] = {
                    'failure_mae': failure_mae,
                    'rul_mae': rul_mae,
                    'training_samples': len(X_train),
                    'feature_importance': failure_model.feature_importances_.tolist()
                }
                
                logger.info(f"✅ {component} model trained - Failure MAE: {failure_mae:.3f}, RUL MAE: {rul_mae:.1f}")
                
            except Exception as e:
                logger.error(f"Error training {component} model: {e}")
                training_results[component] = {'error': str(e)}
                
        # Save trained models
        self._save_models()
        
        return training_results
        
    def _prepare_training_data(
        self, 
        component: str, 
        historical_data: List[Dict]
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Prepare training data for a component"""
        
        X, y_failure, y_rul = [], [], []
        
        for record in historical_data:
            if record.get('component') != component:
                continue
                
            # Extract features from historical record
            features = record.get('features', [])
            if not features:
                continue
                
            # Target variables
            failure_occurred = record.get('failure_occurred', 0)
            days_to_failure = record.get('days_to_failure', 30)
            
            X.append(features)
            y_failure.append(failure_occurred)
            y_rul.append(days_to_failure)
            
        return np.array(X), np.array(y_failure), np.array(y_rul)
        
    def generate_maintenance_schedule(
        self, 
        predictions: List[MaintenancePrediction]
    ) -> Dict[str, Any]:
        """Generate optimal maintenance schedule based on predictions"""
        
        # Sort predictions by urgency
        urgent_predictions = sorted(predictions, key=lambda x: x.urgency_score, reverse=True)
        
        schedule = {
            'immediate': [],  # Within 24 hours
            'this_week': [],  # Within 7 days
            'this_month': [],  # Within 30 days
            'planned': [],    # Beyond 30 days
            'total_cost': 0,
            'total_trainsets': len(set(p.trainset_id for p in predictions))
        }
        
        for prediction in urgent_predictions:
            days_until = prediction.remaining_useful_life
            
            if days_until <= 1:
                schedule['immediate'].append(prediction)
            elif days_until <= 7:
                schedule['this_week'].append(prediction)
            elif days_until <= 30:
                schedule['this_month'].append(prediction)
            else:
                schedule['planned'].append(prediction)
                
            schedule['total_cost'] += prediction.cost_estimate
            
        return schedule
        
    def get_fleet_health_summary(self) -> Dict[str, Any]:
        """Get overall fleet health summary"""
        
        # Get all trainset IDs from recent telemetry
        trainset_ids = list(set(t.trainset_id for t in self.telemetry_history[-500:]))
        
        fleet_predictions = []
        for trainset_id in trainset_ids:
            predictions = self.analyze_trainset_health(trainset_id)
            fleet_predictions.extend(predictions)
            
        if not fleet_predictions:
            return {"status": "no_data", "message": "No recent telemetry data available"}
            
        # Calculate summary statistics
        health_counts = {status.value: 0 for status in ComponentHealth}
        component_health = {component: [] for component in self.components}
        total_cost = 0
        
        for pred in fleet_predictions:
            health_counts[pred.health_status.value] += 1
            component_health[pred.component].append(pred.health_status.value)
            total_cost += pred.cost_estimate
            
        # Calculate component health averages
        component_scores = {}
        for component, healths in component_health.items():
            if healths:
                score_map = {
                    'excellent': 5, 'good': 4, 'fair': 3, 'poor': 2, 'critical': 1
                }
                avg_score = np.mean([score_map.get(h, 3) for h in healths])
                component_scores[component] = {
                    'average_score': avg_score,
                    'status': 'excellent' if avg_score >= 4.5 else 
                             'good' if avg_score >= 3.5 else 
                             'fair' if avg_score >= 2.5 else 
                             'poor' if avg_score >= 1.5 else 'critical'
                }
                
        return {
            'fleet_size': len(trainset_ids),
            'total_predictions': len(fleet_predictions),
            'health_distribution': health_counts,
            'component_health': component_scores,
            'estimated_maintenance_cost': total_cost,
            'critical_issues': len([p for p in fleet_predictions if p.health_status == ComponentHealth.CRITICAL]),
            'urgent_maintenance': len([p for p in fleet_predictions if p.remaining_useful_life <= 7]),
            'fleet_availability': max(0, 100 - (health_counts['critical'] + health_counts['poor']) * 4)
        }
        
    def _save_models(self):
        """Save trained models to disk"""
        import os
        
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Save all models and scalers
        for name, model in self.models.items():
            if hasattr(model, 'feature_importances_'):
                joblib.dump(model, f"{self.model_dir}/{name}.pkl")
                
        for name, scaler in self.scalers.items():
            if hasattr(scaler, 'mean_'):
                joblib.dump(scaler, f"{self.model_dir}/{name}.pkl")
                
        for name, detector in self.anomaly_detectors.items():
            if hasattr(detector, 'decision_function'):
                joblib.dump(detector, f"{self.model_dir}/anomaly_{name}.pkl")
                
        logger.info(f"Predictive maintenance models saved to {self.model_dir}")
        
    def load_models(self):
        """Load trained models from disk"""
        import os
        
        if not os.path.exists(self.model_dir):
            logger.warning(f"Model directory {self.model_dir} not found")
            return
            
        loaded_count = 0
        
        # Load models
        for name in self.models.keys():
            model_path = f"{self.model_dir}/{name}.pkl"
            if os.path.exists(model_path):
                self.models[name] = joblib.load(model_path)
                loaded_count += 1
                
        # Load scalers
        for name in self.scalers.keys():
            scaler_path = f"{self.model_dir}/{name}.pkl"
            if os.path.exists(scaler_path):
                self.scalers[name] = joblib.load(scaler_path)
                loaded_count += 1
                
        # Load anomaly detectors
        for component in self.components:
            detector_path = f"{self.model_dir}/anomaly_{component}.pkl"
            if os.path.exists(detector_path):
                self.anomaly_detectors[component] = joblib.load(detector_path)
                loaded_count += 1
                
        logger.info(f"Loaded {loaded_count} predictive maintenance models")


# Global predictive maintenance instance
predictive_maintenance = PredictiveMaintenanceAI()