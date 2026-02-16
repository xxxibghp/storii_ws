from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

import sys
sys.path.append("..")

from ai_writer import run_ai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

BASE_PATH = Path(__file__).resolve().parent.parent

FRONTEND_PATH = Path(__file__).resolve().parent.parent / "frontend"

app.mount("/static", StaticFiles(directory=FRONTEND_PATH), name="static")

@app.get("/")
def read_index():
    return FileResponse(FRONTEND_PATH / "index.html")

class PromptRequest(BaseModel):
    prompt: str
    context: str

def build_tree(path):
    tree = []

    for item in sorted(path.iterdir()):
        if item.name.startswith("."):
            continue

        node = {
            "name": item.name,
            "path": str(item.relative_to(BASE_PATH)),
            "type": "folder" if item.is_dir() else "file"
        }

        if item.is_dir():
            node["children"] = build_tree(item)

        tree.append(node)

    return tree

@app.get("/files")
def get_files():
    return build_tree(BASE_PATH)

@app.get("/file")
def read_file(path: str):
    full_path = BASE_PATH / path
    return {"content": full_path.read_text(encoding="utf-8")}

class SaveRequest(BaseModel):
    path: str
    content: str

@app.post("/save")
def save_file(req: SaveRequest):
    full_path = BASE_PATH / req.path
    full_path.write_text(req.content, encoding="utf-8")
    return {"status": "saved"}

from pathlib import Path

GLOBAL_RAG_CONTEXT = ""

@app.post("/load_rag")
def load_rag():
    global GLOBAL_RAG_CONTEXT

    context_chunks = []

    for path in BASE_PATH.rglob("*.md"):

        # ❌ Bỏ qua thư mục chapters
        # if "chapters" in path.parts: continue

        text = path.read_text(encoding="utf-8")
        context_chunks.append(f"\n\n### {path.name}\n{text}")

    GLOBAL_RAG_CONTEXT = "\n".join(context_chunks)

    char_count = len(GLOBAL_RAG_CONTEXT)
    token_estimate = char_count // 4

    return {
        "status": "RAG loaded",
        "characters": char_count,
        "estimated_tokens": token_estimate
    }



@app.post("/ai")
def call_ai(req: PromptRequest):
    global GLOBAL_RAG_CONTEXT

    full_context = GLOBAL_RAG_CONTEXT + "\n\nNội dung chap hiện tại:\n" + req.context

    result = run_ai(req.prompt, full_context)
    return {"result": result}

