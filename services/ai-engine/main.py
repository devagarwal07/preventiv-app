from fastapi import FastAPI

app = FastAPI(title="Prevntiv AI Engine")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
