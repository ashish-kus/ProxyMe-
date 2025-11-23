import os
import shutil
import hashlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

load_dotenv()
app = FastAPI(title="Resume Chatbot")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VECTOR_DIR = "vectorstore"
RESUME_PATH = "pdf/resume.pdf"
HASH_FILE = "resume.hash"

os.makedirs(os.path.dirname(RESUME_PATH), exist_ok=True)


# -----------------------------------------------
# Structured Output Models
# -----------------------------------------------
class ResumeAnswer(BaseModel):
    """Structured response for resume questions"""

    answer: str = Field(description="Direct answer to the question")
    relevant_sections: list[str] = Field(
        description="List of resume keywords relevant to the answer"
    )
    follow_up_questions: list[str] = Field(
        description="Suggested follow-up questions user might ask"
    )


# -----------------------------------------------
# Utility: calculate pdf hash
# -----------------------------------------------
def file_hash(path):
    with open(path, "rb") as f:
        data = f.read()
        return hashlib.sha256(data).hexdigest()


# -----------------------------------------------
# Build vector DB
# -----------------------------------------------
def build_vectorstore():
    try:
        print("Building vector DB...")
        if not os.path.exists(RESUME_PATH):
            raise ValueError(
                f"Resume file not found at {RESUME_PATH}. Please place your resume there."
            )

        loader = PyPDFLoader(RESUME_PATH)
        docs = loader.load()

        if not docs:
            raise ValueError("PDF contains no readable content")

        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(docs)
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        vectordb = FAISS.from_documents(chunks, embedding=embeddings)
        vectordb.save_local(VECTOR_DIR)
        print("Vector DB updated!")
        return True
    except Exception as e:
        print(f"Error building vector DB: {str(e)}")
        return False


# -----------------------------------------------
# Load vector DB
# -----------------------------------------------
def load_vectorstore():
    try:
        embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
        return FAISS.load_local(
            VECTOR_DIR, embeddings, allow_dangerous_deserialization=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error loading vector DB: {str(e)}"
        )


# -----------------------------------------------
# Ask Request Model
# -----------------------------------------------
class AskRequest(BaseModel):
    question: str


# -----------------------------------------------
# Health Check & Initialize
# -----------------------------------------------
@app.get("/health")
async def health_check():
    vectordb_exists = os.path.exists(VECTOR_DIR)
    resume_exists = os.path.exists(RESUME_PATH)
    return {
        "status": "ok",
        "vectordb_exists": vectordb_exists,
        "resume_exists": resume_exists,
    }


@app.post("/initialize")
async def initialize():
    """Initialize the vector store from the default resume"""
    if not os.path.exists(RESUME_PATH):
        raise HTTPException(
            status_code=400,
            detail=f"Resume file not found at {RESUME_PATH}. Please place your resume there.",
        )

    # Calculate hash
    new_hash = file_hash(RESUME_PATH)

    # Read old hash if exists
    old_hash = None
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, "r") as f:
            old_hash = f.read().strip()

    # Compare hashes - if same, vectorstore is still valid
    if old_hash == new_hash and os.path.exists(VECTOR_DIR):
        return {
            "status": "ready",
            "message": "Vector DB already initialized with current resume.",
        }

    # Delete old vector DB if it exists
    if os.path.exists(VECTOR_DIR):
        shutil.rmtree(VECTOR_DIR)

    # Build new vector DB
    success = build_vectorstore()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to build vector database")

    # Save new hash
    with open(HASH_FILE, "w") as f:
        f.write(new_hash)

    return {"status": "initialized", "message": "Vector DB built successfully."}


# -----------------------------------------------
# /ask API with Structured Output
# -----------------------------------------------
@app.post("/ask")
async def ask(req: AskRequest) -> ResumeAnswer:
    if not os.path.exists(VECTOR_DIR):
        raise HTTPException(
            status_code=400,
            detail="Vector DB not initialized. Call /initialize first.",
        )

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        vectordb = load_vectorstore()
        retriever = vectordb.as_retriever(search_type="similarity", k=5)
        docs = retriever.invoke(req.question)
        context = "\n\n".join([d.page_content for d in docs])

        # Initialize LLM with structured output
        llm = ChatOpenAI(model="gpt-4o-mini")
        structured_llm = llm.with_structured_output(ResumeAnswer)

        prompt = f"""You are a helpful chatbot who answers questions based only on the resume below.

Resume Context:
{context}

Question: {req.question}

Respond with structured data:
- answer: Direct answer to the question. If not found in resume, say "This information is not in the resume."
- relevant_keywords: List of resume keywords (e.g., "Experience", "Skills", "Education", "Contact")
- follow_up_questions: Suggest 2-3 relevant follow-up questions the user might ask next.
"""
        response = structured_llm.invoke(prompt)
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing question: {str(e)}"
        )
