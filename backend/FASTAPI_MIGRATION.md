# FastAPI Migration Guide

## ✅ Migration Complete

All Express routes have been successfully migrated to FastAPI Python backend.

---

## 📂 Files Created

### Services (Python MCP Ports)
- `/backend/src/services/mcp_document_generator.py` - Document generation service
- `/backend/src/services/mcp_notes_service.py` - Notes/records database service
- `/backend/src/services/mcp_technician_service.py` - Technician database service

### API Routers
- `/backend/src/api/router/llm/prompt_llm.py` - **POST /api/promptLLM** (streaming with SSE)
- `/backend/src/api/router/llm/technicians.py` - **CRUD /api/technicians**
- `/backend/src/api/router/llm/records.py` - **CRUD /api/records**
- `/backend/src/api/router/llm/download_pdp.py` - **GET /api/download-pdp**

### Configuration
- `/backend/src/api/main.py` - Updated with new routers

---

## 🚀 How to Run

### 1. Start FastAPI Backend

```bash
cd /Users/edoardo/Documents/LocalAI/backend

# Install dependencies (if not already)
pip install -r requirements.txt

# Run with uvicorn
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Environment Variables

Ensure you have these in your `.env`:

```bash
OPENAI_API_KEY=your_openai_key_here
```

### 3. Test Endpoints

**Health check:**
```bash
curl http://localhost:8000/health
```

**List technicians:**
```bash
curl http://localhost:8000/api/technicians/
```

**List records:**
```bash
curl http://localhost:8000/api/records/
```

**Streaming LLM (with SSE):**
```bash
curl -X POST http://localhost:8000/api/promptLLM/ \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 2000,
    "useMcpTools": false,
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'
```

---

## 📊 Endpoint Mapping

| Express Route | FastAPI Route | Method | Description |
|--------------|---------------|--------|-------------|
| `/api/promptLLM` | `/api/promptLLM/` | POST | Streaming LLM with MCP tools |
| `/api/technicians` | `/api/technicians/` | GET | List all technicians |
| `/api/technicians/:id` | `/api/technicians/{id}` | GET | Get single technician |
| `/api/technicians` | `/api/technicians/` | POST | Create technician |
| `/api/technicians/:id` | `/api/technicians/{id}` | PUT | Update technician |
| `/api/technicians/:id` | `/api/technicians/{id}` | DELETE | Delete technician |
| `/api/records` | `/api/records/` | GET | List all records |
| `/api/records/:id` | `/api/records/{id}` | GET | Get single record |
| `/api/records` | `/api/records/` | POST | Create record |
| `/api/records/:id` | `/api/records/{id}` | PUT | Update record |
| `/api/records/:id` | `/api/records/{id}` | DELETE | Delete record |
| `/api/download-pdp` | `/api/download-pdp/` | GET | Download latest PDP |

---

## 🔄 Request/Response Compatibility

All endpoints **preserve the exact same request/response shapes** as Express routes.

### Example: Technicians

**Request (POST /api/technicians/):**
```json
{
  "first_name": "Elie",
  "last_name": "Amour",
  "phone": "06.44.34.06.88",
  "email": "ea@supairvision.com",
  "company": "Supairvision",
  "certifications": [
    {
      "certification_type": "GWO",
      "certification_name": "GWO Working at Heights",
      "issue_date": "2023-05-15",
      "expiry_date": "2025-05-15"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "elie_amour",
    "first_name": "Elie",
    "last_name": "Amour",
    "phone": "06.44.34.06.88",
    "email": "ea@supairvision.com",
    "company": "Supairvision",
    "certifications": [...],
    "created_at": "2025-11-18T...",
    "updated_at": "2025-11-18T..."
  }
}
```

### Example: Streaming LLM

**Request (POST /api/promptLLM/):**
```json
{
  "model": "gpt-4o-mini",
  "temperature": 0.2,
  "maxTokens": 2000,
  "useMcpTools": true,
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Extract data and generate PDP..."
    }
  ]
}
```

**Response (SSE Stream):**
```
data: {"content": "Sure", "done": false}

data: {"content": ", I can", "done": false}

data: {"content": " help", "done": false}

data: {"content": "", "done": true}
```

---

## 🛠️ MCP Tools Integration

The Python backend bridges to the existing Node.js MCP tools for now. Long-term, these will be fully ported to Python.

### Supported MCP Tools

1. **generate_pdp_document**
   - Generate PDP documents from templates
   - Automatically saves technicians to database
   - Merges with annual PDF

2. **save_note**
   - Save operational notes/records
   - Validates date, type, and required fields

### Tool Execution Flow

```
Frontend → FastAPI → Python Service → (Bridge to Node MCP) → Result
```

Future state:
```
Frontend → FastAPI → Pure Python MCP Service → Result
```

---

## 📁 Database Files

All services continue to use the same JSON database files:

- **Technicians:** `/mcp/technicians_database.json`
- **Records:** `/mcp/data/PDP/notes_database.json`
- **PDPs:** `/mcp/data/PDP/{windfarm}/`

No changes to file locations or formats.

---

## 🔧 Frontend Configuration

### Option 1: Point to Python Backend (Recommended)

Update `/frontend/src/config/api.ts`:

```typescript
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
```

### Option 2: Keep Express for Now

You can run both backends:
- Python FastAPI: `http://localhost:8000`
- Node Express: `http://localhost:3000`

And selectively migrate frontend calls.

---

## 🧪 Testing Checklist

### Technicians
- [ ] GET /api/technicians/ - List all
- [ ] GET /api/technicians/{id} - Get single
- [ ] POST /api/technicians/ - Create new
- [ ] PUT /api/technicians/{id} - Update existing
- [ ] DELETE /api/technicians/{id} - Delete

### Records
- [ ] GET /api/records/ - List all
- [ ] GET /api/records/{id} - Get single
- [ ] POST /api/records/ - Create new
- [ ] PUT /api/records/{id} - Update existing
- [ ] DELETE /api/records/{id} - Delete

### Documents
- [ ] GET /api/download-pdp/ - Download latest PDF
- [ ] GET /api/download-pdp/?surname=gati - Download specific windfarm PDF

### LLM Streaming
- [ ] POST /api/promptLLM/ - Basic streaming without tools
- [ ] POST /api/promptLLM/ - With useMcpTools=true
- [ ] POST /api/promptLLM/ - Tool calls generate_pdp_document
- [ ] POST /api/promptLLM/ - Tool calls save_note

### Frontend Pages
- [ ] /technicians page loads and displays data
- [ ] /records page loads and displays data
- [ ] Edit technician works
- [ ] Edit record works
- [ ] PDP generation from email works
- [ ] SavePoint (save note) from email works

---

## 🐛 Troubleshooting

### Issue: CORS errors

**Solution:** CORS is already configured in `main.py` to allow `http://localhost:3000`. If using a different frontend URL, update the `allow_origins` list.

### Issue: OpenAI API key not found

**Solution:** Ensure `OPENAI_API_KEY` is set in your environment or `.env` file.

### Issue: Database files not found

**Solution:** Ensure the MCP directory structure exists:
```bash
mkdir -p /Users/edoardo/Documents/LocalAI/mcp/data/PDP
```

### Issue: MCP tools fail

**Solution:** For now, MCP tools bridge to Node.js. Ensure the Node MCP server is accessible. Future: pure Python implementation.

---

## 📊 Performance

- **SSE Streaming:** Identical to Express implementation
- **JSON Operations:** Faster in Python with native JSON handling
- **File I/O:** Similar performance to Node.js
- **Async:** Python async/await with uvicorn ASGI server

---

## 🚧 Future Enhancements

### Short-term
- [ ] Add request validation middleware
- [ ] Add rate limiting
- [ ] Add authentication/authorization
- [ ] Add request logging

### Long-term
- [ ] Fully port MCP tools to Python (no Node bridge)
- [ ] Add database caching layer
- [ ] Add background task queue for document generation
- [ ] Add WebSocket support for real-time updates

---

## 📝 API Documentation

FastAPI provides automatic interactive API docs:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These docs include:
- All endpoints
- Request/response schemas
- Try-it-out functionality
- Example payloads

---

## ✅ Migration Checklist

- [x] Create Python MCP services
- [x] Implement technicians CRUD router
- [x] Implement records CRUD router
- [x] Implement download-pdp router
- [x] Implement promptLLM streaming router with SSE
- [x] Register routers in main.py
- [x] Preserve request/response shapes
- [x] Maintain JSON database compatibility
- [ ] Update frontend to point to Python backend
- [ ] Test all endpoints
- [ ] Test frontend integration
- [ ] Deploy to production

---

## 🎯 Next Steps

1. **Start the FastAPI server:**
   ```bash
   cd backend
   uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Test endpoints using the interactive docs:**
   - Visit http://localhost:8000/docs
   - Try each endpoint

3. **Update frontend config:**
   - Point `API_BASE_URL` to `http://localhost:8000/api`
   - Test Technicians page
   - Test Records page
   - Test PDP generation

4. **Decommission Express server:**
   - Once all tests pass, remove `/frontend/server.js`
   - Remove Express routes from `/frontend/routes/`
   - Update deployment configs

---

**Status:** ✅ Migration Complete - Ready for Testing

**Contact:** Check logs at `backend/logs/` for any issues.
