from google import genai
import os
import faiss
import numpy as np
import pickle

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def embed_text(text):
    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return np.array(response.embeddings[0].values, dtype="float32")

documents = []
metadata = []

folders = ["overview", "characters", "timeline", "organizations"]

for folder in folders:
    for file in os.listdir(f"../{folder}"):
        with open(f"../{folder}/{file}", "r", encoding="utf-8") as f:
            content = f.read()
            documents.append(content)
            metadata.append(f"{folder}/{file}")

vectors = np.vstack([embed_text(doc) for doc in documents])

dimension = vectors.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(vectors)

faiss.write_index(index, "index.faiss")

with open("metadata.pkl", "wb") as f:
    pickle.dump(metadata, f)

print("RAG index built.")

