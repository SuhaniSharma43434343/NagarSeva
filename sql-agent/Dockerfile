FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY sql-agent/requirements.txt ./
RUN pip install -r requirements.txt
COPY sql-agent/ ./
CMD ["sh", "-c", "exec gunicorn interface:app --bind 0.0.0.0:${PORT:-5001} --workers 1 --threads 4 --timeout 180 --access-logfile -"]
