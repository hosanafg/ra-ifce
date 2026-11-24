# Backend: auth_api + easyocr (contexto de build = raiz do repositório)
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

# torch somente CPU (imagem bem menor) + demais dependências
COPY docker/backend.requirements.txt /tmp/requirements.txt
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r /tmp/requirements.txt

# Baixa os modelos do EasyOCR (pt) durante o build: o container não precisa de internet para rodar
ENV EASYOCR_MODULE_PATH=/opt/easyocr
RUN python -c "import easyocr; easyocr.Reader(['pt'], gpu=False)"

# ocr.py espera ../../../easyocr relativo a auth_api/app/routers  ->  /srv/easyocr
COPY easyocr /srv/easyocr
COPY auth_api /srv/auth_api

WORKDIR /srv/auth_api
RUN mkdir -p /data /srv/easyocr/logs

ENV DATABASE_URL=sqlite:////data/app.db
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
