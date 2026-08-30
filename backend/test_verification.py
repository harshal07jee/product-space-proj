import sys
import os
import json

# Ensure parent directory is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.seed import seed_database
from backend.services.allocation_engine import parse_skills, match_skills

def test_full_acceptance_flow():
    print("\n==========================================")
    print("STARTING WORKLENS AI ENHANCED ACCEPTANCE TESTING")
    print("==========================================\n")

    # 1. Reset Database to Baseline Seed Data
    print("1. Resetting Database to Demo Seed State...")
    seed_database()

    client = TestClient(app)

    # 2. Test Authentication Endpoints (JWT + PBKDF2)
    print("\n2. Testing Authentication & Multi-Tenancy Subsystem...")
    login_res = client.post("/api/auth/login", json={
        "email": "alex@worklens.ai",
        "password": "password123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    auth_data = login_res.json()
    token = auth_data["access_token"]
    assert token, "No access token returned!"
    print(f"   • Admin JWT Login Successful: {auth_data['user']['name']} ({auth_data['user']['email']})")

    # Test /api/auth/me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, f"/api/auth/me failed: {me_res.text}"
    assert me_res.json()["email"] == "alex@worklens.ai"
    print(f"   • /api/auth/me verified for tenant: '{me_res.json()['tenant_id']}'")

    # Test User Registration
    reg_res = client.post("/api/auth/register", json={
        "name": "Sarah Connor",
        "email": "sarah@cyberdyne.org",
        "password": "securepassword99",
        "role": "Director",
        "tenant_id": "cyberdyne_org"
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    print(f"   • Multi-Tenant User Registered: Sarah Connor (tenant: cyberdyne_org)")

    # 3. Test Exact Skill Matching Engine (No Substring False Positives)
    print("\n3. Testing Exact Skill Token Matching Precision...")
    req_c = parse_skills("C, Embedded")
    cand_css = parse_skills("CSS, HTML, React")
    matched_c_css = match_skills(req_c, cand_css)
    assert len(matched_c_css) == 0, f"Error: 'C' matched 'CSS'! Got: {matched_c_css}"
    print("   • Verified 'C' does not match 'CSS' [PASSED]")

    req_java = parse_skills("Java, Spring")
    cand_js = parse_skills("JavaScript, Node")
    matched_java_js = match_skills(req_java, cand_js)
    assert len(matched_java_js) == 0, f"Error: 'Java' matched 'JavaScript'! Got: {matched_java_js}"
    print("   • Verified 'Java' does not match 'JavaScript' [PASSED]")

    req_react = parse_skills("React, TypeScript")
    cand_reactjs = parse_skills("ReactJS, Node.js, TS")
    matched_react = match_skills(req_react, cand_reactjs)
    assert "react" in matched_react and "typescript" in matched_react, f"Alias match failed: {matched_react}"
    print("   • Verified Canonical Aliases (ReactJS -> React, TS -> TypeScript) [PASSED]")

    # 4. Query Initial Dashboard State
    print("\n4. Querying Initial Dashboard Metrics...")
    dash_res = client.get("/api/dashboard")
    assert dash_res.status_code == 200, f"Dashboard error: {dash_res.text}"
    dash_data = dash_res.json()

    print(f"   • Team Utilization: {dash_data['team_utilization']}%")
    print(f"   • Overloaded Employees: {dash_data['overloaded_count']}")
    print(f"   • At-Risk Projects: {dash_data['at_risk_projects_count']}")
    print(f"   • Available Capacity: {dash_data['available_capacity_hours']} hrs")

    # Verify Rahul is overloaded (122.5%) & Neha is available (52.5%)
    rahul_chart = next(item for item in dash_data["workload_chart"] if item["name"] == "Rahul")
    neha_chart = next(item for item in dash_data["workload_chart"] if item["name"] == "Neha")

    print(f"   • Rahul Utilization BEFORE: {rahul_chart['utilization']}% ({rahul_chart['status']})")
    print(f"   • Neha Utilization BEFORE: {neha_chart['utilization']}% ({neha_chart['status']})")

    assert rahul_chart["utilization"] == 122.5, f"Expected Rahul 122.5%, got {rahul_chart['utilization']}%"
    assert neha_chart["utilization"] == 52.5, f"Expected Neha 52.5%, got {neha_chart['utilization']}%"

    # Verify Payment Gateway Project Risk is HIGH
    pay_proj = next(p for p in dash_data["project_risks"] if p["project_name"] == "Payment Gateway")
    print(f"   • Payment Gateway Risk BEFORE: {pay_proj['risk_level']} (Score: {pay_proj['risk_score']})")
    assert pay_proj["risk_level"] == "HIGH", f"Expected Payment Gateway HIGH risk, got {pay_proj['risk_level']}"

    # Verify Top Recommendation is generated
    recs = dash_data["top_recommendations"]
    assert len(recs) > 0, "No recommendations generated!"

    # 5. Test Recommendation Rejection & Deduplication
    print("\n5. Testing Recommendation Rejection & Anti-Duplication Lifecycle...")
    initial_recs_count = len(recs)
    last_rec = recs[-1]
    reject_res = client.post(f"/api/recommendations/{last_rec['id']}/reject")
    assert reject_res.status_code == 200, f"Reject failed: {reject_res.text}"
    print(f"   • Recommendation #{last_rec['id']} rejected.")

    # Refresh dashboard - ensure the rejected recommendation was NOT resurrected
    refresh_dash = client.get("/api/dashboard").json()
    pending_ids = [r["id"] for r in refresh_dash["top_recommendations"]]
    assert last_rec["id"] not in pending_ids, f"Rejected recommendation #{last_rec['id']} was resurrected!"
    print("   • Verified rejected recommendation is not duplicated upon dashboard refresh [PASSED]")

    # 6. Execute Manager Approval for Target Recommendation
    rec_to_approve = next(
        (r for r in refresh_dash["top_recommendations"] if r["from_employee_name"] == "Rahul" and r["to_employee_name"] == "Neha"),
        refresh_dash["top_recommendations"][0]
    )

    print(f"\n6. Executing Manager Approval for Recommendation ID #{rec_to_approve['id']}:")
    print(f"   • Move '{rec_to_approve['task_title']}' from {rec_to_approve['from_employee_name']} to {rec_to_approve['to_employee_name']}")
    
    approve_res = client.post(f"/api/recommendations/{rec_to_approve['id']}/approve")
    assert approve_res.status_code == 200, f"Approve failed: {approve_res.text}"
    approve_data = approve_res.json()
    print(f"   • Success: {approve_data['message']}")

    # 7. Query Recalculated Dashboard Metrics
    print("\n7. Querying Updated Dashboard Metrics After Redistribution...")
    new_dash_res = client.get("/api/dashboard")
    new_dash = new_dash_res.json()

    rahul_after = next(item for item in new_dash["workload_chart"] if item["name"] == "Rahul")
    neha_after = next(item for item in new_dash["workload_chart"] if item["name"] == "Neha")
    pay_proj_after = next(p for p in new_dash["project_risks"] if p["project_name"] == "Payment Gateway")

    print(f"   • Rahul Utilization AFTER: {rahul_after['utilization']}% ({rahul_after['status']})")
    print(f"   • Neha Utilization AFTER: {neha_after['utilization']}% ({neha_after['status']})")
    print(f"   • Payment Gateway Risk AFTER: {pay_proj_after['risk_level']} (Score: {pay_proj_after['risk_score']})")

    assert rahul_after["utilization"] == 92.5, f"Expected Rahul 92.5%, got {rahul_after['utilization']}%"
    assert neha_after["utilization"] == 82.5, f"Expected Neha 82.5%, got {neha_after['utilization']}%"

    # 8. Test AI Chat Assistant
    print("\n8. Testing WorkLens AI Assistant Chat API...")
    chat_res = client.post("/api/chat", json={"message": "Who is overloaded?"})
    assert chat_res.status_code == 200
    print(f"   • Chat Query Response:\n{chat_res.json()['reply']}\n")

    # 9. Test Activity Log & Audit Trail API
    print("\n9. Testing Activity Log & Audit Trail Endpoint...")
    logs_res = client.get("/api/activity-logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0, "No activity logs returned!"
    print(f"   • Retrieved {len(logs)} activity logs. Latest: '{logs[0]['description']}'")

    # 10. Test Task Management CRUD (Create, Update, Delete)
    print("\n10. Testing Task Management CRUD...")
    # Create Task
    create_task_res = client.post("/api/tasks", json={
        "project_id": 1,
        "title": "API Stress Testing",
        "description": "Load test the payment endpoints with 10k RPS",
        "assigned_employee_id": 2, # Neha
        "estimated_hours": 8.0,
        "remaining_hours": 8.0,
        "priority": "HIGH",
        "deadline": "2026-09-10",
        "complexity": "MEDIUM",
        "required_skills": "Python,FastAPI",
        "status": "TODO"
    })
    assert create_task_res.status_code == 200
    new_task = create_task_res.json()
    task_id = new_task["id"]
    print(f"   • Created Task #{task_id}: '{new_task['title']}' assigned to {new_task['assigned_employee_name']}")

    # Update Task
    update_task_res = client.put(f"/api/tasks/{task_id}", json={
        "remaining_hours": 4.0,
        "status": "IN_PROGRESS"
    })
    assert update_task_res.status_code == 200
    updated_task = update_task_res.json()
    assert updated_task["remaining_hours"] == 4.0
    print(f"   • Updated Task #{task_id}: Remaining effort updated to {updated_task['remaining_hours']}h")

    # Delete Task
    delete_task_res = client.delete(f"/api/tasks/{task_id}")
    assert delete_task_res.status_code == 200
    print(f"   • Deleted Task #{task_id} successfully.")

    # 11. Test Task Dependencies API
    print("\n11. Testing Task Dependencies & Project Timeline API...")
    deps_res = client.get("/api/dependencies")
    assert deps_res.status_code == 200
    deps = deps_res.json()
    print(f"   • Retrieved {len(deps)} existing task dependency relations.")

    proj_deps_res = client.get("/api/projects/1/dependencies")
    assert proj_deps_res.status_code == 200
    print(f"   • Retrieved {len(proj_deps_res.json())} dependencies for Project #1.")

    # 12. Test What-If Scenario Simulator
    print("\n12. Testing What-If Scenario Simulator (Evaluate & Commit)...")
    sim_eval_res = client.post("/api/simulator/evaluate", json={
        "changes": [
            {
                "task_id": 1,
                "new_assigned_employee_id": 2, # Move to Neha
                "new_remaining_hours": 10.0
            }
        ]
    })
    assert sim_eval_res.status_code == 200
    sim_data = sim_eval_res.json()
    assert "projected_team_utilization" in sim_data
    assert "workload_comparison" in sim_data
    assert "project_risks_comparison" in sim_data
    print(f"   • Simulated Scenario: Team Util {sim_data['current_team_utilization']}% -> {sim_data['projected_team_utilization']}%")

    print("==========================================")
    print("ALL 12 ADVANCED ACCEPTANCE TESTS PASSED! [100% SUCCESS]")
    print("==========================================\n")

if __name__ == "__main__":
    test_full_acceptance_flow()
