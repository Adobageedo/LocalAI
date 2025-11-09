# Usage Examples

This document provides practical examples of using the MCP PDP Document Generator.

## Table of Contents

1. [Basic Document Generation](#basic-document-generation)
2. [RAG Context Retrieval](#rag-context-retrieval)
3. [Enhanced Generation with RAG](#enhanced-generation-with-rag)
4. [Template Management](#template-management)
5. [Error Handling](#error-handling)
6. [Advanced Scenarios](#advanced-scenarios)

---

## Basic Document Generation

### Example 1: Simple PDP Document

Generate a basic PDP document with minimal data:

```json
{
  "tool": "generate_pdp_document",
  "arguments": {
    "pdpId": "PDP-2024-001",
    "windfarmName": "WindFarm Alpha",
    "data": {
      "title": "Routine Maintenance",
      "description": "Quarterly turbine inspection",
      "date": "2024-01-15",
      "technicians": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "role": "Lead Technician"
        }
      ]
    }
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "pdpId": "PDP-2024-001",
  "windfarmName": "WindFarm Alpha",
  "filePath": "/path/to/data/pdp/WindFarm_Alpha/PDP_PDP-2024-001_WindFarm_Alpha_2024-01-15T10-30-00-000Z.docx",
  "size": 45678,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Example 2: Comprehensive PDP with Multiple Technicians

Generate a detailed PDP document:

```json
{
  "tool": "generate_pdp_document",
  "arguments": {
    "pdpId": "PDP-2024-002",
    "windfarmName": "Offshore Wind Site",
    "data": {
      "title": "Annual Preventive Maintenance",
      "description": "Complete turbine overhaul and safety inspection",
      "date": "2024-02-01",
      "location": "Turbines T1-T5",
      "duration": "3 days",
      "technicians": [
        {
          "name": "Alice Smith",
          "email": "alice@windtech.com",
          "role": "Lead Technician",
          "phone": "+1-555-0101",
          "tasks": ["Coordination", "Safety oversight"]
        },
        {
          "name": "Bob Johnson",
          "email": "bob@windtech.com",
          "role": "Mechanical Engineer",
          "phone": "+1-555-0102",
          "tasks": ["Gearbox inspection", "Blade maintenance"]
        },
        {
          "name": "Carol Williams",
          "email": "carol@windtech.com",
          "role": "Electrical Engineer",
          "phone": "+1-555-0103",
          "tasks": ["Electrical systems", "Control panels"]
        }
      ],
      "safety_measures": [
        "Fall protection equipment mandatory",
        "LOTO procedures for all electrical work",
        "Weather monitoring throughout operation"
      ]
    }
  }
}
```

---

## RAG Context Retrieval

### Example 3: Fetch General Context

Retrieve contextual information from RAG API:

```json
{
  "tool": "fetch_rag_context",
  "arguments": {
    "query": "What are the standard safety procedures for wind turbine maintenance?",
    "collection": "edoardo",
    "topK": 5
  }
}
```

**Expected Output**:
```json
{
  "success": true,
  "context": "Standard safety procedures include: 1) Always wear full body harness... 2) Follow LOTO procedures...",
  "documents": [
    {
      "content": "Wind turbine safety manual excerpt...",
      "metadata": {
        "source": "safety_manual.pdf",
        "page": 15
      }
    }
  ],
  "metadata": {
    "query": "What are the standard safety procedures...",
    "collection": "edoardo",
    "topK": 5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### Example 4: Fetch Specific Technical Context

Retrieve technical information for specific equipment:

```json
{
  "tool": "fetch_rag_context",
  "arguments": {
    "query": "Vestas V90 gearbox maintenance procedures and oil specifications",
    "collection": "edoardo",
    "topK": 3,
    "rerank": true
  }
}
```

---

## Enhanced Generation with RAG

### Example 5: Generate PDP with Automatic RAG Enhancement

Generate a PDP document enriched with contextual information:

```json
{
  "tool": "generate_pdp_with_rag",
  "arguments": {
    "pdpId": "PDP-2024-003",
    "windfarmName": "Mountain Ridge Wind Farm",
    "data": {
      "title": "Blade Repair Operation",
      "description": "Emergency repair on Turbine T7 blade damage",
      "turbineModel": "Vestas V90",
      "issueDescription": "Leading edge erosion on blade 2"
    },
    "enhanceWithRAG": true
  }
}
```

**What Happens**:
1. System fetches relevant context about blade repair procedures
2. Context is added to the template data as `ragContext` and `ragDocuments`
3. Document is generated with enriched information
4. Result includes `ragEnhanced: true` flag

---

### Example 6: Generate with Custom RAG Query

Use a custom query for RAG context:

```json
{
  "tool": "generate_pdp_with_rag",
  "arguments": {
    "pdpId": "PDP-2024-004",
    "windfarmName": "Coastal Wind Park",
    "data": {
      "title": "Salt Corrosion Inspection",
      "description": "Inspection of coastal turbine corrosion"
    },
    "ragQuery": "Coastal wind turbine corrosion inspection procedures, salt exposure mitigation, and protective coating maintenance",
    "enhanceWithRAG": true
  }
}
```

---

## Template Management

### Example 7: List Available Templates

Check which templates are available:

```json
{
  "tool": "list_templates",
  "arguments": {}
}
```

**Expected Output**:
```json
{
  "templates": [
    "pdp_template.docx",
    "maintenance_report.docx",
    "safety_inspection.docx"
  ],
  "count": 3,
  "templateFolder": "./templates"
}
```

---

### Example 8: Use Custom Template

Generate document with a specific template:

```json
{
  "tool": "generate_pdp_document",
  "arguments": {
    "pdpId": "SAFETY-2024-001",
    "windfarmName": "Test Site",
    "data": {
      "inspection_type": "Annual Safety Audit",
      "inspector": "Jane Doe"
    },
    "templateName": "safety_inspection.docx"
  }
}
```

---

## Error Handling

### Example 9: Missing Required Fields

Attempting generation without required data:

```json
{
  "tool": "generate_pdp_document",
  "arguments": {
    "pdpId": "PDP-2024-005",
    "data": {
      "title": "Maintenance"
    }
  }
}
```

**Expected Error**:
```json
{
  "error": "Missing required parameter: windfarmName",
  "tool": "generate_pdp_document",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Example 10: RAG API Unavailable

When RAG API is down but document generation should continue:

```json
{
  "tool": "generate_pdp_with_rag",
  "arguments": {
    "pdpId": "PDP-2024-006",
    "windfarmName": "Test Farm",
    "data": { "title": "Maintenance" },
    "enhanceWithRAG": false
  }
}
```

This will generate the document without RAG enhancement, avoiding API errors.

---

## Advanced Scenarios

### Example 11: Data Cleaning in Action

The service automatically cleans data. This input:

```json
{
  "technicians": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "name": "",
      "email": "",
      "phone": ""
    },
    {
      "name": "Jane Smith",
      "role": "Engineer"
    }
  ]
}
```

Will be cleaned to:

```json
{
  "technicians": [
    {
      "name": "John Doe",
      "email": "john@example.com"
    },
    {
      "name": "Jane Smith",
      "role": "Engineer"
    }
  ]
}
```

The empty technician entry is removed automatically.

---

### Example 12: Complex Nested Data

Generate document with deeply nested structures:

```json
{
  "tool": "generate_pdp_document",
  "arguments": {
    "pdpId": "PDP-2024-007",
    "windfarmName": "Complex Site",
    "data": {
      "project": {
        "name": "Major Overhaul",
        "phase": "Phase 2",
        "manager": {
          "name": "Alex Thompson",
          "contact": {
            "email": "alex@example.com",
            "phone": "+1-555-0200",
            "emergency": "+1-555-0201"
          }
        }
      },
      "work_packages": [
        {
          "id": "WP-001",
          "title": "Electrical Systems",
          "tasks": [
            { "name": "Inspect panels", "duration": "2h" },
            { "name": "Test circuits", "duration": "4h" }
          ]
        },
        {
          "id": "WP-002",
          "title": "Mechanical Components",
          "tasks": [
            { "name": "Gearbox oil change", "duration": "3h" },
            { "name": "Bearing inspection", "duration": "2h" }
          ]
        }
      ]
    }
  }
}
```

---

### Example 13: Batch Processing (Pseudo-code)

To process multiple PDPs, call the tool multiple times:

```javascript
const pdps = [
  { pdpId: "PDP-001", windfarmName: "Site A", data: {...} },
  { pdpId: "PDP-002", windfarmName: "Site B", data: {...} },
  { pdpId: "PDP-003", windfarmName: "Site C", data: {...} }
];

for (const pdp of pdps) {
  await client.callTool('generate_pdp_document', pdp);
}
```

---

## Best Practices

1. **Always provide complete data**: Include all required fields to avoid generation errors
2. **Use RAG wisely**: Enable RAG enhancement when contextual information adds value
3. **Clean your data**: While automatic cleaning helps, pre-validate your data
4. **Template consistency**: Ensure placeholders in data match template structure
5. **Error handling**: Always check response success status and handle errors gracefully
6. **Logging**: Review logs for detailed error information when issues occur

---

## Troubleshooting Common Issues

### Issue: "Template not found"
**Solution**: Verify template exists in `templates/` folder and name matches exactly

### Issue: "Placeholder not found in template"
**Solution**: Ensure data keys match template placeholders exactly (case-sensitive)

### Issue: "RAG API timeout"
**Solution**: Check network connectivity and RAG API status using `status://rag` resource

### Issue: "Document generation failed"
**Solution**: Review detailed error logs in `logs/mcp-server.log` for specific template errors

---

For more information, see the main [README.md](../README.md) file.
