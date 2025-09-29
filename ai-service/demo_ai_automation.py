"""
Demo Script for KMRL AI Automation System
Run this to see the AI automation in action!
"""

import asyncio
import requests
import json
from datetime import datetime
import time

# Configuration
AI_SERVICE_URL = "http://localhost:8001"
API_BASE = f"{AI_SERVICE_URL}/api/v1/ai"

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"🤖 {title}")
    print("="*60)

def print_section(title):
    """Print a section header"""
    print(f"\n🔹 {title}")
    print("-" * 40)

def demo_system_startup():
    """Demo: Start the AI automation system"""
    print_header("STARTING AI AUTOMATION SYSTEM")
    
    try:
        # Start AI automation
        response = requests.post(f"{API_BASE}/start")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result['message']}")
            print(f"📅 Started at: {result['timestamp']}")
            print(f"🚀 Systems started: {', '.join(result['systems_started'])}")
            return True
        else:
            print(f"❌ Failed to start AI automation: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_system_status():
    """Demo: Check AI system status"""
    print_header("AI SYSTEM STATUS CHECK")
    
    try:
        response = requests.get(f"{API_BASE}/status")
        if response.status_code == 200:
            status = response.json()
            print(f"🧠 Decision Engine: {'✅ Active' if status['decision_engine_active'] else '❌ Inactive'}")
            print(f"🔮 Predictive Maintenance: {'✅ Active' if status['predictive_maintenance_active'] else '❌ Inactive'}")
            print(f"📅 Intelligent Scheduler: {'✅ Active' if status['intelligent_scheduler_active'] else '❌ Inactive'}")
            print(f"🎯 System Confidence: {status['system_confidence']:.1%}")
            print(f"🤖 Automation Level: {status['automation_level']:.1f}%")
            print(f"📊 Total Decisions: {status['total_decisions_made']}")
            print(f"📋 Total Schedules: {status['total_schedules_generated']}")
            return True
        else:
            print(f"❌ Failed to get status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_predictive_maintenance():
    """Demo: Send telemetry data and get predictions"""
    print_header("PREDICTIVE MAINTENANCE DEMO")
    
    # Sample telemetry data
    telemetry_data = {
        "trainset_id": "TS001",
        "mileage": 52000,
        "engine_temperature": 78.5,
        "brake_pressure": 0.85,
        "door_cycles": 1250,
        "hvac_efficiency": 0.82,
        "battery_voltage": 12.3,
        "vibration_level": 0.15,
        "noise_level": 65.2,
        "power_consumption": 125.8,
        "speed_profile": [0, 20, 45, 60, 45, 20, 0],
        "failure_codes": []
    }
    
    try:
        print_section("Sending Telemetry Data")
        print(f"📡 Trainset: {telemetry_data['trainset_id']}")
        print(f"🏃 Mileage: {telemetry_data['mileage']:,} km")
        print(f"🌡️ Engine Temp: {telemetry_data['engine_temperature']}°C")
        print(f"🚙 Brake Pressure: {telemetry_data['brake_pressure']:.2f} bar")
        
        response = requests.post(f"{API_BASE}/maintenance/telemetry", json=telemetry_data)
        
        if response.status_code == 200:
            result = response.json()
            print_section("AI Predictions Received")
            print(f"✅ Status: {result['status']}")
            print(f"📊 Total Predictions: {result['total_predictions']}")
            
            for pred in result['predictions']:
                print(f"\n🔧 Component: {pred['component']}")
                print(f"  Health: {pred['health_status']}")
                print(f"  Confidence: {pred['confidence']:.1%}")
                print(f"  Days Remaining: {pred['remaining_useful_life']}")
                print(f"  Action: {pred['recommended_action']}")
                print(f"  Cost Estimate: ₹{pred['cost_estimate']:,.0f}")
                
            return True
        else:
            print(f"❌ Failed to process telemetry: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_intelligent_scheduler():
    """Demo: Generate a schedule manually"""
    print_header("INTELLIGENT SCHEDULER DEMO")
    
    schedule_request = {
        "schedule_type": "peak_hour",
        "priority": "passenger_comfort",
        "duration_hours": 4,
        "constraints": {
            "expected_demand": 15000,
            "weather": "rainy",
            "special_events": []
        },
        "force_generate": False
    }
    
    try:
        print_section("Generating AI Schedule")
        print(f"📅 Type: {schedule_request['schedule_type']}")
        print(f"🎯 Priority: {schedule_request['priority']}")
        print(f"⏱️ Duration: {schedule_request['duration_hours']} hours")
        print(f"👥 Expected Demand: {schedule_request['constraints']['expected_demand']:,}")
        print(f"🌧️ Weather: {schedule_request['constraints']['weather']}")
        
        response = requests.post(f"{API_BASE}/scheduler/generate", json=schedule_request)
        
        if response.status_code == 200:
            result = response.json()
            print_section("AI Schedule Generated")
            print(f"✅ Status: {result['status']}")
            print(f"🆔 Schedule ID: {result['schedule_id']}")
            print(f"🎯 Confidence: {result['confidence']:.1%}")
            print(f"⚡ Execution: {result['execution_status']}")
            print(f"🚂 Trainsets: {result['trainsets_assigned']}")
            
            print_section("Performance Estimates")
            performance = result['estimated_performance']
            for metric, value in performance.items():
                print(f"  {metric}: {value:.1%}")
                
            print_section("Risk Assessment")
            risks = result['risk_assessment']
            for risk_type, value in risks.items():
                risk_level = "🟢 Low" if value < 0.3 else "🟡 Medium" if value < 0.7 else "🔴 High"
                print(f"  {risk_type}: {risk_level} ({value:.1%})")
                
            if result['monitoring_alerts']:
                print_section("Monitoring Alerts")
                for alert in result['monitoring_alerts']:
                    print(f"  ⚠️ {alert}")
                    
            return True
        else:
            print(f"❌ Failed to generate schedule: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_ai_insights():
    """Demo: Get AI performance insights"""
    print_header("AI PERFORMANCE INSIGHTS")
    
    try:
        # Get performance insights
        response = requests.get(f"{API_BASE}/insights/performance")
        
        if response.status_code == 200:
            insights = response.json()
            
            print_section("System Performance")
            perf = insights['system_performance']
            print(f"🤖 Total AI Operations: {perf['total_ai_operations']}")
            print(f"⚡ Autonomous Operations: {perf['autonomous_operations']}")
            print(f"📈 Automation Efficiency: {perf['automation_efficiency']}%")
            print(f"🎯 Average Confidence: {perf['average_system_confidence']:.1%}")
            
            print_section("Decision Engine Metrics")
            decisions = insights['decision_engine_metrics']
            print(f"📊 Total Decisions: {decisions['total_decisions']}")
            print(f"⏳ Active Decisions: {decisions['active_decisions']}")
            print(f"🤖 Autonomous Decisions: {decisions['autonomous_decisions']}")
            
            print_section("Fleet Health Metrics")
            fleet = insights['fleet_health_metrics']
            print(f"🚂 Fleet Size: {fleet['fleet_size']}")
            print(f"✅ Fleet Availability: {fleet['fleet_availability']}%")
            print(f"🚨 Critical Issues: {fleet['critical_issues']}")
            print(f"💰 Maintenance Cost: ₹{fleet['estimated_maintenance_cost']:,.0f}")
            
            return True
        else:
            print(f"❌ Failed to get insights: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_ai_recommendations():
    """Demo: Get AI recommendations"""
    print_header("AI RECOMMENDATIONS")
    
    try:
        response = requests.get(f"{API_BASE}/insights/recommendations")
        
        if response.status_code == 200:
            result = response.json()
            recommendations = result['recommendations']
            
            print(f"📋 Total Recommendations: {result['total_recommendations']}")
            print(f"🔴 High Priority: {result['high_priority']}")
            print(f"🟡 Medium Priority: {result['medium_priority']}")
            print(f"🟢 Low Priority: {result['low_priority']}")
            
            print_section("Recommendations")
            for i, rec in enumerate(recommendations, 1):
                priority_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}[rec['priority']]
                print(f"\n{i}. {priority_icon} {rec['type'].upper()}")
                print(f"   📝 {rec['message']}")
                print(f"   🎯 Action: {rec['action']}")
                print(f"   💡 Impact: {rec['impact']}")
                
            return True
        else:
            print(f"❌ Failed to get recommendations: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def demo_health_check():
    """Demo: Check AI system health"""
    print_header("AI SYSTEM HEALTH CHECK")
    
    try:
        response = requests.get(f"{API_BASE}/health")
        
        if response.status_code == 200:
            health = response.json()
            
            print(f"🏥 Overall Status: {health['status'].upper()}")
            print(f"📅 Timestamp: {health['timestamp']}")
            print(f"ℹ️ Uptime: {health['uptime_info']}")
            
            print_section("System Components")
            systems = health['systems']
            for system, status in systems.items():
                if system != 'overall_health':
                    status_icon = "✅" if status else "❌"
                    print(f"  {status_icon} {system.replace('_', ' ').title()}")
                    
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Main demo function"""
    print("🤖 KMRL AI AUTOMATION SYSTEM DEMO")
    print("💡 This demo will show you the AI automation capabilities")
    print(f"🌐 AI Service URL: {AI_SERVICE_URL}")
    
    # Check if AI service is running
    try:
        response = requests.get(AI_SERVICE_URL)
        if response.status_code != 200:
            print("❌ AI service is not running. Please start it first:")
            print("   cd ai-service && python -m uvicorn main:app --reload --port 8001")
            return
    except:
        print("❌ Cannot connect to AI service. Please ensure it's running on port 8001")
        return
    
    demos = [
        ("System Health Check", demo_health_check),
        ("System Startup", demo_system_startup),
        ("System Status", demo_system_status),
        ("Predictive Maintenance", demo_predictive_maintenance),
        ("Intelligent Scheduler", demo_intelligent_scheduler),
        ("Performance Insights", demo_ai_insights),
        ("AI Recommendations", demo_ai_recommendations),
    ]
    
    print("\n🎬 Starting AI Automation Demo...")
    
    for title, demo_func in demos:
        print(f"\n⏳ Running: {title}...")
        success = demo_func()
        
        if success:
            print(f"✅ {title} completed successfully")
        else:
            print(f"❌ {title} failed")
            
        # Small delay between demos
        time.sleep(2)
    
    print_header("DEMO COMPLETED")
    print("🎉 AI automation demo finished!")
    print("💡 The AI system is now running and making autonomous decisions")
    print("📊 Check the API endpoints for real-time monitoring")
    print("🔗 API Documentation: http://localhost:8001/docs")

if __name__ == "__main__":
    main()