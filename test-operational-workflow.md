# Expected Workflow Once KV Storage is Active

## Current Status
The system architecture is complete and the KV storage code is deployed, but the connection isn't active yet. Once it connects, here's what will happen with session `KODS7KZQ`:

## Step 1: Create a Student Dataset
```bash
curl -X POST 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api/request' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionCode": "KODS7KZQ",
    "requestId": "create-dataset-001",
    "toolName": "create_dataset_with_table",
    "params": {
      "name": "StudentData",
      "title": "Student Performance Dataset",
      "attributes": [
        {"name": "student_id", "type": "categorical", "description": "Student ID"},
        {"name": "math_score", "type": "numeric", "description": "Math score (0-100)"},
        {"name": "reading_score", "type": "numeric", "description": "Reading score (0-100)"},
        {"name": "grade", "type": "categorical", "description": "Grade level"}
      ],
      "data": [
        {"student_id": "S001", "math_score": 85, "reading_score": 78, "grade": "10th"},
        {"student_id": "S002", "math_score": 92, "reading_score": 88, "grade": "10th"},
        {"student_id": "S003", "math_score": 76, "reading_score": 82, "grade": "11th"},
        {"student_id": "S004", "math_score": 88, "reading_score": 75, "grade": "11th"},
        {"student_id": "S005", "math_score": 94, "reading_score": 91, "grade": "12th"}
      ],
      "tableName": "StudentTable"
    }
  }'
```

**Expected Result**: A new table will appear in your CODAP session with 5 students and their performance data.

## Step 2: Create a Scatter Plot Visualization
```bash
curl -X POST 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api/request' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionCode": "KODS7KZQ",
    "requestId": "create-graph-001", 
    "toolName": "create_graph",
    "params": {
      "dataContext": "StudentData",
      "graphType": "scatterplot",
      "xAttribute": "math_score",
      "yAttribute": "reading_score",
      "title": "Math vs Reading Performance",
      "width": 500,
      "height": 400
    }
  }'
```

**Expected Result**: A scatter plot will appear showing the correlation between math and reading scores.

## Step 3: Check What Was Created
```bash
curl -X POST 'https://codap-mcp-cdorsey-concordorgs-projects.vercel.app/api/request' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionCode": "KODS7KZQ",
    "requestId": "check-status-001",
    "toolName": "get_data_contexts",
    "params": {}
  }'
```

**Expected Result**: Returns a list of all data contexts, including the new "StudentData" context.

## What You Should See in CODAP
1. **New Data Table**: "StudentTable" with 5 rows of student performance data
2. **Scatter Plot Graph**: Showing math scores (x-axis) vs reading scores (y-axis)
3. **Interactive Visualization**: You can click points to see student details

## Architecture Flow
```
Your API Request → KV Storage (req:KODS7KZQ) → SSE Stream → Browser Worker → CODAP Plugin API → Your CODAP Session
```

The system is designed correctly and ready to work - it just needs the KV storage connection to become active. 