import os
import sys
from datetime import datetime, timedelta, timezone

# Ensure parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.database import Base, engine, SessionLocal
from backend.models.models import User, Employee, Project, Task, TaskDependency, Recommendation, ActivityLog
from backend.services.allocation_engine import generate_recommendations_for_overloaded
from backend.core.auth import hash_password

def seed_database(scenario_name: str = "baseline"):
    print(f"Initializing Database Schema for scenario: {scenario_name}...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding Users...")
        admin = User(
            tenant_id="default_tenant",
            name="Manager Alex",
            email="alex@worklens.ai",
            password_hash=hash_password("password123"),
            role="Engineering Manager"
        )
        db.add(admin)

        print("Seeding Employees...")
        # 10 Employees with distinct roles, capacities, and skills
        employees_data = [
            # Key Demo Characters
            {"name": "Rahul", "role": "Senior Backend Engineer", "skills": "Python,API,FastAPI,PostgreSQL", "capacity": 40.0},
            {"name": "Neha", "role": "Backend Engineer", "skills": "Python,API,FastAPI,SQL", "capacity": 40.0},
            {"name": "Amit", "role": "Lead Systems Engineer", "skills": "Go,Kubernetes,Docker,AWS,Python", "capacity": 40.0 if scenario_name != "outage" else 0.0},
            {"name": "Priya", "role": "Fullstack Developer", "skills": "React,TypeScript,Next.js,Node.js,Python", "capacity": 40.0},
            {"name": "Suresh", "role": "Frontend Engineer", "skills": "React,TailwindCSS,TypeScript,CSS", "capacity": 40.0},
            {"name": "Ananya", "role": "Data Engineer", "skills": "Python,SQL,Spark,ETL,PostgreSQL", "capacity": 35.0},
            {"name": "Vikram", "role": "DevOps Specialist", "skills": "Docker,CI/CD,Terraform,AWS", "capacity": 40.0},
            {"name": "Kavita", "role": "QA Automation Engineer", "skills": "Selenium,Python,Playwright,Jest", "capacity": 40.0},
            {"name": "Rohan", "role": "UI/UX Designer", "skills": "Figma,UI/UX,Design Systems,CSS", "capacity": 40.0},
            {"name": "Deepak", "role": "Security Engineer", "skills": "OAuth,Security,Python,Linux", "capacity": 40.0},
        ]

        emp_map = {}
        for emp in employees_data:
            avail = "On Leave (Outage)" if (scenario_name == "outage" and emp["name"] == "Amit") else "Active"
            e = Employee(
                tenant_id="default_tenant",
                name=emp["name"],
                role=emp["role"],
                skills=emp["skills"],
                weekly_capacity=emp["capacity"],
                availability=avail
            )
            db.add(e)
            db.flush()
            emp_map[emp["name"]] = e

        print("Seeding Projects...")
        today = datetime.now(timezone.utc)

        # Adjust project deadlines based on scenario
        days_pg = 1 if scenario_name in ["crunch", "outage"] else 2
        days_app = 1 if scenario_name == "crunch" else 7
        days_analytics = 2 if scenario_name == "crunch" else 14

        projects_data = [
            {"name": "Payment Gateway", "description": "Core payment integration with Stripe and PCI compliance", "priority": "HIGH", "deadline": (today + timedelta(days=days_pg)).strftime("%Y-%m-%d")},
            {"name": "Mobile App V2", "description": "Next-gen enterprise mobile app", "priority": "HIGH", "deadline": (today + timedelta(days=days_app)).strftime("%Y-%m-%d")},
            {"name": "Analytics Dashboard", "description": "Real-time usage and revenue analytics platform", "priority": "HIGH" if scenario_name == "crunch" else "MEDIUM", "deadline": (today + timedelta(days=days_analytics)).strftime("%Y-%m-%d")},
            {"name": "Infrastructure Migration", "description": "Cloud migration to Kubernetes and AWS EKS", "priority": "LOW", "deadline": (today + timedelta(days=30)).strftime("%Y-%m-%d")},
        ]

        proj_map = {}
        for p in projects_data:
            proj = Project(
                tenant_id="default_tenant",
                name=p["name"],
                description=p["description"],
                priority=p["priority"],
                deadline=p["deadline"],
                status="IN_PROGRESS"
            )
            db.add(proj)
            db.flush()
            proj_map[p["name"]] = proj

        print("Seeding Tasks...")
        tasks_list = []

        # Scenario-specific Rahul workload adjustments
        rahul_api_hours = 22.0 if scenario_name == "crunch" else 12.0

        t_payment_api = Task(
            tenant_id="default_tenant",
            project_id=proj_map["Payment Gateway"].id,
            title="Payment API Integration",
            description="Implement PCI-compliant Stripe checkout endpoint and webhook handlers",
            assigned_employee_id=emp_map["Rahul"].id,
            estimated_hours=24.0 if scenario_name == "crunch" else 16.0,
            remaining_hours=rahul_api_hours,
            priority="HIGH",
            deadline=(today + timedelta(days=days_pg)).strftime("%Y-%m-%d"),
            complexity="HARD",
            required_skills="Python,API,FastAPI",
            status="IN_PROGRESS"
        )
        tasks_list.append(t_payment_api)

        # Other Rahul tasks
        tasks_list.extend([
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Payment Gateway"].id,
                title="Refund & Chargeback Workflow",
                description="Backend API logic for processing automated customer refunds",
                assigned_employee_id=emp_map["Rahul"].id,
                estimated_hours=20.0,
                remaining_hours=15.0,
                priority="HIGH",
                deadline=(today + timedelta(days=3)).strftime("%Y-%m-%d"),
                complexity="MEDIUM",
                required_skills="Python,API",
                status="IN_PROGRESS"
            ),
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Payment Gateway"].id,
                title="Database Tokenization Schema",
                description="Secure vault storage for encrypted credit card tokens",
                assigned_employee_id=emp_map["Rahul"].id,
                estimated_hours=16.0,
                remaining_hours=12.0,
                priority="HIGH",
                deadline=(today + timedelta(days=4)).strftime("%Y-%m-%d"),
                complexity="HARD",
                required_skills="PostgreSQL,Python",
                status="TODO"
            ),
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Analytics Dashboard"].id,
                title="Transaction Logging Middleware",
                description="Audit logging middleware for financial transactions",
                assigned_employee_id=emp_map["Rahul"].id,
                estimated_hours=12.0,
                remaining_hours=10.0,
                priority="MEDIUM",
                deadline=(today + timedelta(days=10)).strftime("%Y-%m-%d"),
                complexity="MEDIUM",
                required_skills="Python,FastAPI",
                status="TODO"
            ),
        ])

        # Neha Tasks (21 hours in baseline)
        tasks_list.extend([
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Payment Gateway"].id,
                title="Merchant Onboarding API",
                description="API routes for seller business verification",
                assigned_employee_id=emp_map["Neha"].id,
                estimated_hours=16.0,
                remaining_hours=11.0,
                priority="MEDIUM",
                deadline=(today + timedelta(days=5)).strftime("%Y-%m-%d"),
                complexity="MEDIUM",
                required_skills="Python,API,FastAPI",
                status="IN_PROGRESS"
            ),
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Analytics Dashboard"].id,
                title="CSV Export Microservice",
                description="Generate downloadable reports for merchant transactions",
                assigned_employee_id=emp_map["Neha"].id,
                estimated_hours=14.0,
                remaining_hours=10.0,
                priority="LOW",
                deadline=(today + timedelta(days=12)).strftime("%Y-%m-%d"),
                complexity="EASY",
                required_skills="Python,SQL",
                status="TODO"
            ),
        ])

        # Systems tasks (Amit's tasks transferred to Rahul/Vikram if Outage scenario)
        systems_assignee = emp_map["Rahul"].id if scenario_name == "outage" else emp_map["Amit"].id
        tasks_list.extend([
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Infrastructure Migration"].id,
                title="EKS Cluster Provisioning",
                description="Terraform scripts for production Kubernetes cluster",
                assigned_employee_id=systems_assignee,
                estimated_hours=24.0,
                remaining_hours=18.5,
                priority="HIGH",
                deadline=(today + timedelta(days=6)).strftime("%Y-%m-%d"),
                complexity="HARD",
                required_skills="Kubernetes,Docker,AWS",
                status="IN_PROGRESS"
            ),
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Infrastructure Migration"].id,
                title="Service Mesh Service Proxy Setup",
                description="Istio ingress and traffic management policy configuration",
                assigned_employee_id=emp_map["Vikram"].id if scenario_name == "outage" else emp_map["Amit"].id,
                estimated_hours=20.0,
                remaining_hours=15.0,
                priority="HIGH",
                deadline=(today + timedelta(days=8)).strftime("%Y-%m-%d"),
                complexity="HARD",
                required_skills="Kubernetes,Go",
                status="IN_PROGRESS"
            ),
            Task(
                tenant_id="default_tenant",
                project_id=proj_map["Mobile App V2"].id,
                title="Push Notification Gateway Backend",
                description="High throughput gRPC service for APNS/FCM notifications",
                assigned_employee_id=emp_map["Rahul"].id if scenario_name == "outage" else emp_map["Amit"].id,
                estimated_hours=15.0,
                remaining_hours=10.0,
                priority="MEDIUM",
                deadline=(today + timedelta(days=9)).strftime("%Y-%m-%d"),
                complexity="MEDIUM",
                required_skills="Go,Python",
                status="TODO"
            ),
        ])

        # Additional tasks for team members
        roles_assignments = [
            ("Priya", "Mobile App V2", "React Native Authentication Screen", 12, 8, "HIGH", "React,TypeScript"),
            ("Priya", "Mobile App V2", "State Management Redux Store", 14, 10, "MEDIUM", "TypeScript,React"),
            ("Priya", "Analytics Dashboard", "User Analytics Chart Component", 16, 12, "MEDIUM", "React,Next.js"),
            ("Priya", "Analytics Dashboard", "Realtime WebSocket Hook", 10, 5, "LOW", "TypeScript,Python"),

            ("Suresh", "Mobile App V2", "Custom Component Library", 20, 14, "HIGH", "React,TailwindCSS"),
            ("Suresh", "Mobile App V2", "Dark Mode Theme Provider", 8, 4, "LOW", "CSS,React"),
            ("Suresh", "Analytics Dashboard", "Responsive Sidebar Layout", 10, 6, "MEDIUM", "TailwindCSS,React"),
            ("Suresh", "Payment Gateway", "Checkout Form UI Modal", 12, 8, "HIGH", "React,TypeScript"),

            ("Ananya", "Analytics Dashboard", "Aggregation Pipeline Spark Job", 20, 15, "HIGH", "Spark,Python,SQL"),
            ("Ananya", "Analytics Dashboard", "PostgreSQL Read Replica Config", 12, 8, "MEDIUM", "PostgreSQL,SQL"),
            ("Ananya", "Payment Gateway", "Financial Reporting ETL Pipeline", 14, 10, "MEDIUM", "ETL,Python,SQL"),

            ("Vikram", "Infrastructure Migration", "CI/CD Deployment Pipelines", 16, 12, "HIGH", "CI/CD,Docker,AWS"),
            ("Vikram", "Infrastructure Migration", "Helm Chart Templates for Microservices", 14, 10, "MEDIUM", "Docker,Kubernetes"),
            ("Vikram", "Payment Gateway", "Vault Secrets Management Setup", 10, 6, "HIGH", "Terraform,AWS"),

            ("Kavita", "Payment Gateway", "Payment Gateway End-to-End Suite", 18, 14, "HIGH", "Selenium,Python,Playwright"),
            ("Kavita", "Mobile App V2", "Mobile UI Integration Tests", 14, 10, "MEDIUM", "Playwright,Jest"),
            ("Kavita", "Analytics Dashboard", "API Load Test Scripts", 10, 6, "LOW", "Python,Playwright"),

            ("Rohan", "Mobile App V2", "Figma High-Fidelity UI Prototypes", 16, 10, "HIGH", "Figma,UI/UX"),
            ("Rohan", "Payment Gateway", "Checkout UX Design System", 12, 8, "MEDIUM", "Figma,UI/UX"),
            ("Rohan", "Analytics Dashboard", "Data Visualization Design Spec", 10, 6, "LOW", "UI/UX,Design Systems"),

            ("Deepak", "Payment Gateway", "PCI-DSS Security Audit & Remediation", 20, 15, "HIGH", "Security,OAuth,Linux"),
            ("Deepak", "Infrastructure Migration", "Container Vulnerability Scanner Integration", 12, 8, "MEDIUM", "Security,Linux"),
            ("Deepak", "Mobile App V2", "OAuth2 PKCE Flow Verification", 10, 6, "HIGH", "OAuth,Security"),
        ]

        for emp_name, proj_name, t_title, est, rem, prio, skills in roles_assignments:
            tasks_list.append(Task(
                tenant_id="default_tenant",
                project_id=proj_map[proj_name].id,
                title=t_title,
                description=f"{t_title} implementation for {proj_name}",
                assigned_employee_id=emp_map[emp_name].id,
                estimated_hours=float(est),
                remaining_hours=float(rem),
                priority=prio,
                deadline=(today + timedelta(days=7)).strftime("%Y-%m-%d"),
                complexity="HARD" if scenario_name == "skillgap" else "MEDIUM",
                required_skills=skills if scenario_name != "skillgap" else f"{skills},Kubernetes,Rust",
                status="IN_PROGRESS" if rem > 5 else "TODO"
            ))

        for t in tasks_list:
            db.add(t)

        db.flush()

        print("Seeding Task Dependencies...")
        dep1 = TaskDependency(
            tenant_id="default_tenant",
            task_id=tasks_list[2].id,
            depends_on_task_id=tasks_list[0].id
        )
        db.add(dep1)

        print("Generating Initial AI Recommendations...")
        recs = generate_recommendations_for_overloaded(db, exclude_processed=False)
        for r in recs:
            rec_obj = Recommendation(
                tenant_id="default_tenant",
                task_id=r["task_id"],
                from_employee_id=r["from_employee_id"],
                to_employee_id=r["to_employee_id"],
                reason=r["reason"],
                risk_before=r["risk_before"],
                risk_after=r["risk_after"],
                score=r["score"],
                status="PENDING"
            )
            db.add(rec_obj)

        print("Seeding Initial Activity Log...")
        log = ActivityLog(
            tenant_id="default_tenant",
            action="SCENARIO_LOADED",
            entity_type="System",
            description=f"Loaded WorkLens AI workload scenario: '{scenario_name.upper()}' with 10 employees, 4 projects, and 50+ tasks."
        )
        db.add(log)

        db.commit()
        print(f"Database Seeding for '{scenario_name}' Completed Successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    scenario = sys.argv[1] if len(sys.argv) > 1 else "baseline"
    seed_database(scenario)

