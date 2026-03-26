FROM python:3.11-slim AS builder
WORKDIR /install
COPY services/ai-engine/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install/deps -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /install/deps /usr/local
COPY services/ai-engine /app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
